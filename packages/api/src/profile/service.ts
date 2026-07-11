import type { PrismaClient } from "@runup/db";
import { computeStreak } from "./streak.js";
import type { BodyMetricInput, PersonalRecordInput } from "./schemas.js";

const COMPLETED = ["done", "partial"] as const;

export interface Stats {
  totalDistanceMeters: number;
  totalTimeSeconds: number;
  workoutCount: number;
  weeklyDistanceMeters: number;
  monthlyDistanceMeters: number;
  streakDays: number;
  avgPaceSecPerKm: number | null;
  /** Data (YYYY-MM-DD) do treino registrado mais recente, se houver. */
  lastWorkoutDate: string | null;
}

export class ProfileService {
  constructor(private readonly db: PrismaClient) {}

  addBodyMetric(studentId: string, input: BodyMetricInput) {
    return this.db.bodyMetric.create({
      data: {
        studentId,
        date: new Date(input.date),
        weightKg: input.weightKg,
        bodyFatPct: input.bodyFatPct,
      },
    });
  }

  listBodyMetrics(studentId: string) {
    return this.db.bodyMetric.findMany({
      where: { studentId },
      orderBy: { date: "desc" },
    });
  }

  addPersonalRecord(studentId: string, input: PersonalRecordInput) {
    return this.db.personalRecord.create({
      data: {
        studentId,
        distance: input.distance,
        timeSeconds: input.timeSeconds,
        achievedAt: new Date(input.achievedAt),
      },
    });
  }

  listPersonalRecords(studentId: string) {
    return this.db.personalRecord.findMany({
      where: { studentId },
      orderBy: { achievedAt: "desc" },
    });
  }

  /** Estatísticas agregadas do aluno para o dashboard. */
  async stats(studentId: string, now: Date = new Date()): Promise<Stats> {
    // Conta treinos planejados concluídos + atividades avulsas (ex.: Strava).
    const where = {
      studentId,
      OR: [
        { workoutDay: { status: { in: [...COMPLETED] } } },
        { workoutDayId: null },
      ],
    };

    const [totals, week, month, logDates] = await Promise.all([
      this.db.workoutLog.aggregate({
        where,
        _sum: { distanceMeters: true, durationSeconds: true },
        _count: true,
      }),
      this.db.workoutLog.aggregate({
        where: { ...where, completedAt: { gte: startOfWeek(now) } },
        _sum: { distanceMeters: true },
      }),
      this.db.workoutLog.aggregate({
        where: { ...where, completedAt: { gte: startOfMonth(now) } },
        _sum: { distanceMeters: true },
      }),
      this.db.workoutLog.findMany({
        where,
        select: { completedAt: true },
      }),
    ]);

    const totalDistance = totals._sum.distanceMeters ?? 0;
    const totalTime = totals._sum.durationSeconds ?? 0;
    const avgPace =
      totalDistance > 0 ? Math.round(totalTime / (totalDistance / 1000)) : null;
    const lastWorkout = logDates.reduce<Date | null>(
      (latest, l) => (!latest || l.completedAt > latest ? l.completedAt : latest),
      null,
    );

    return {
      totalDistanceMeters: totalDistance,
      totalTimeSeconds: totalTime,
      workoutCount: totals._count,
      weeklyDistanceMeters: week._sum.distanceMeters ?? 0,
      monthlyDistanceMeters: month._sum.distanceMeters ?? 0,
      streakDays: computeStreak(
        logDates.map((l) => l.completedAt),
        now,
      ),
      avgPaceSecPerKm: avgPace,
      lastWorkoutDate: lastWorkout ? lastWorkout.toISOString() : null,
    };
  }
}

function startOfWeek(now: Date): Date {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  // Semana começa na segunda-feira.
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d;
}

function startOfMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
