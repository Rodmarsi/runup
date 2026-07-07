import type { PrismaClient } from "@runup/db";
import type { RaceDistance } from "@runup/types";
import { RACE_DISTANCE_METERS } from "@runup/core";
import { errors } from "../errors.js";
import type { StravaClient, StravaActivity, StravaTokens } from "./client.js";

export interface SyncResult {
  imported: number;
  matched: number;
  standalone: number;
  prsUpdated: number;
}

/** Tolerância para considerar uma atividade "na distância" de uma prova. */
const DISTANCE_TOLERANCE = 0.02;

export class StravaService {
  constructor(
    private readonly db: PrismaClient,
    private readonly client: StravaClient,
  ) {}

  /** Conecta a conta do aluno via código OAuth do Strava. */
  async connect(studentId: string, code: string) {
    const tokens = await this.client.exchangeCode(code);
    await this.db.stravaConnection.upsert({
      where: { studentId },
      create: {
        studentId,
        athleteId: tokens.athleteId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
      update: {
        athleteId: tokens.athleteId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
    });
  }

  async disconnect(studentId: string) {
    await this.db.stravaConnection.deleteMany({ where: { studentId } });
  }

  /**
   * Importa atividades recentes: casa com o dia planejado (vira WorkoutLog
   * source=strava) ou guarda como avulsa; atualiza RPs. Renova o token se preciso.
   */
  async sync(studentId: string, now: Date = new Date()): Promise<SyncResult> {
    const conn = await this.db.stravaConnection.findUnique({
      where: { studentId },
    });
    if (!conn) throw errors.stravaNotConnected();

    const accessToken = await this.ensureFreshToken(studentId, conn, now);
    const activities = await this.client.listActivities(accessToken);

    const result: SyncResult = {
      imported: 0,
      matched: 0,
      standalone: 0,
      prsUpdated: 0,
    };

    for (const activity of activities) {
      const already = await this.db.workoutLog.findUnique({
        where: { stravaActivityId: activity.id },
      });
      if (already) continue;

      const dayId = await this.matchDay(studentId, activity);
      await this.createLog(studentId, activity, dayId);
      result.imported += 1;
      if (dayId) {
        result.matched += 1;
        await this.db.workoutDay.update({
          where: { id: dayId },
          data: { status: "done" },
        });
      } else {
        result.standalone += 1;
      }

      if (await this.maybeUpdatePR(studentId, activity)) result.prsUpdated += 1;
    }

    return result;
  }

  /** Renova o access token se expirado, preservando o athleteId. */
  private async ensureFreshToken(
    studentId: string,
    conn: { accessToken: string; refreshToken: string; expiresAt: Date; athleteId: string },
    now: Date,
  ): Promise<string> {
    if (conn.expiresAt > now) return conn.accessToken;

    const refreshed: StravaTokens = await this.client.refresh(conn.refreshToken);
    await this.db.stravaConnection.update({
      where: { studentId },
      data: {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: refreshed.expiresAt,
      },
    });
    return refreshed.accessToken;
  }

  /** Casa a atividade com um dia planejado do aluno na mesma data. */
  private async matchDay(
    studentId: string,
    activity: StravaActivity,
  ): Promise<string | null> {
    const assignments = await this.db.planAssignment.findMany({
      where: { studentId },
      select: { planId: true },
    });
    const planIds = assignments.map((a) => a.planId);
    if (planIds.length === 0) return null;

    const day = activity.startDate.slice(0, 10);
    const start = new Date(`${day}T00:00:00.000Z`);
    const end = new Date(`${day}T23:59:59.999Z`);

    const candidate = await this.db.workoutDay.findFirst({
      where: {
        planId: { in: planIds },
        date: { gte: start, lte: end },
        logs: { none: {} },
      },
      orderBy: { date: "asc" },
    });
    return candidate?.id ?? null;
  }

  private createLog(
    studentId: string,
    activity: StravaActivity,
    workoutDayId: string | null,
  ) {
    const paceSecPerKm = Math.round(
      activity.movingTimeSeconds / (activity.distanceMeters / 1000),
    );
    return this.db.workoutLog.create({
      data: {
        workoutDayId,
        studentId,
        source: "strava",
        stravaActivityId: activity.id,
        completedAt: new Date(activity.startDate),
        distanceMeters: activity.distanceMeters,
        durationSeconds: activity.movingTimeSeconds,
        avgPaceSecPerKm: paceSecPerKm,
        avgHeartRate: activity.averageHeartrate,
        cadence: activity.averageCadence,
        elevationGainM: activity.totalElevationGainMeters,
      },
    });
  }

  /** Se a atividade bate numa distância de prova e é a melhor, atualiza o RP. */
  private async maybeUpdatePR(
    studentId: string,
    activity: StravaActivity,
  ): Promise<boolean> {
    for (const [distance, meters] of Object.entries(RACE_DISTANCE_METERS)) {
      const diff = Math.abs(activity.distanceMeters - meters) / meters;
      if (diff > DISTANCE_TOLERANCE) continue;

      const existing = await this.db.personalRecord.findFirst({
        where: { studentId, distance },
        orderBy: { timeSeconds: "asc" },
      });
      if (existing && existing.timeSeconds <= activity.movingTimeSeconds) {
        return false;
      }
      await this.db.personalRecord.create({
        data: {
          studentId,
          distance: distance as RaceDistance,
          timeSeconds: activity.movingTimeSeconds,
          achievedAt: new Date(activity.startDate),
        },
      });
      return true;
    }
    return false;
  }
}
