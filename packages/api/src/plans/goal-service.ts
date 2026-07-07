import type { PrismaClient } from "@runup/db";
import type { RaceDistance } from "@runup/types";
import {
  raceDistanceMeters,
  bestPredictedRaceTime,
  type EffortSample,
} from "@runup/core";
import { errors } from "../errors.js";
import type { CreateGoalInput } from "./schemas.js";

export interface WeekSummary {
  week: number;
  totalDays: number;
  completedDays: number;
}

/** Estimativa de tempo de prova (preditor Riegel) sobre esforços reais. */
export interface RaceEstimate {
  targetDistanceMeters: number | null;
  currentSeconds: number | null;
  byWeek: { week: number; seconds: number }[];
}

export interface GoalOverview {
  goal: {
    id: string;
    targetRace: string;
    raceName: string | null;
    raceDate: string;
    targetTimeSeconds: number | null;
    daysUntilRace: number;
  };
  weeks: WeekSummary[];
  estimate: RaceEstimate;
}

export class GoalService {
  constructor(private readonly db: PrismaClient) {}

  private async assertActiveLink(coachId: string, studentId: string) {
    const link = await this.db.coachStudent.findUnique({
      where: { coachId_studentId: { coachId, studentId } },
    });
    if (!link || link.status !== "active") throw errors.notLinked();
  }

  /** Cria a meta. Aluno cria a própria; treinador cria para aluno vinculado. */
  async createGoal(
    userId: string,
    role: "student" | "coach",
    input: CreateGoalInput,
  ) {
    if (role === "student" && input.studentId !== userId) {
      throw errors.forbidden();
    }
    if (role === "coach") {
      await this.assertActiveLink(userId, input.studentId);
    }
    return this.db.goal.create({
      data: {
        studentId: input.studentId,
        planId: input.planId,
        targetRace: input.targetRace,
        raceName: input.raceName,
        raceDate: new Date(input.raceDate),
        targetTimeSeconds: input.targetTimeSeconds,
      },
    });
  }

  /** Overview da meta: treino agrupado por semana + contagem de concluídos. */
  async overview(
    userId: string,
    role: "student" | "coach",
    goalId: string,
  ): Promise<GoalOverview> {
    const goal = await this.db.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw errors.goalNotFound();

    if (role === "student" && goal.studentId !== userId) {
      throw errors.goalNotFound();
    }
    if (role === "coach") {
      await this.assertActiveLink(userId, goal.studentId);
    }

    const weeks: WeekSummary[] = [];
    if (goal.planId) {
      const days = await this.db.workoutDay.findMany({
        where: { planId: goal.planId },
        select: { week: true, status: true },
      });
      const byWeek = new Map<number, WeekSummary>();
      for (const d of days) {
        const w = byWeek.get(d.week) ?? {
          week: d.week,
          totalDays: 0,
          completedDays: 0,
        };
        w.totalDays += 1;
        if (d.status === "done" || d.status === "partial") w.completedDays += 1;
        byWeek.set(d.week, w);
      }
      weeks.push(...[...byWeek.values()].sort((a, b) => a.week - b.week));
    }

    const daysUntilRace = Math.ceil(
      (goal.raceDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    const estimate = await this.estimate(
      goal.studentId,
      goal.targetRace as RaceDistance,
      goal.planId,
    );

    return {
      goal: {
        id: goal.id,
        targetRace: goal.targetRace,
        raceName: goal.raceName,
        raceDate: goal.raceDate.toISOString().slice(0, 10),
        targetTimeSeconds: goal.targetTimeSeconds,
        daysUntilRace,
      },
      weeks,
      estimate,
    };
  }

  /**
   * Estima o tempo de prova a partir dos esforços reais do aluno:
   * RPs (baseline) + treinos logados com distância e tempo. Fase 1 (Riegel).
   * Também produz a evolução semanal (estimativa cumulativa por semana).
   */
  private async estimate(
    studentId: string,
    targetRace: RaceDistance,
    planId: string | null,
  ): Promise<RaceEstimate> {
    const targetDistanceMeters = raceDistanceMeters(targetRace);
    if (targetDistanceMeters === null) {
      return { targetDistanceMeters: null, currentSeconds: null, byWeek: [] };
    }

    // Baseline: recordes pessoais.
    const prs = await this.db.personalRecord.findMany({ where: { studentId } });
    const baseline: EffortSample[] = prs
      .map((pr) => ({
        distanceMeters: raceDistanceMeters(pr.distance as RaceDistance) ?? 0,
        timeSeconds: pr.timeSeconds,
      }))
      .filter((s) => s.distanceMeters > 0);

    // Esforços dos treinos logados (com distância e tempo), com a semana.
    const logs = planId
      ? await this.db.workoutLog.findMany({
          where: {
            studentId,
            distanceMeters: { not: null },
            durationSeconds: { not: null },
            workoutDay: { planId },
          },
          select: {
            distanceMeters: true,
            durationSeconds: true,
            workoutDay: { select: { week: true } },
          },
        })
      : [];

    const loggedEfforts = logs
      .filter((l) => l.workoutDay !== null)
      .map((l) => ({
        week: l.workoutDay!.week,
        distanceMeters: l.distanceMeters!,
        timeSeconds: l.durationSeconds!,
      }));

    const allSamples: EffortSample[] = [
      ...baseline,
      ...loggedEfforts.map((e) => ({
        distanceMeters: e.distanceMeters,
        timeSeconds: e.timeSeconds,
      })),
    ];
    const currentSeconds = round(
      bestPredictedRaceTime(allSamples, targetDistanceMeters),
    );

    // Evolução: estimativa cumulativa até o fim de cada semana com esforços.
    const weeksWithEfforts = [
      ...new Set(loggedEfforts.map((e) => e.week)),
    ].sort((a, b) => a - b);
    const byWeek: { week: number; seconds: number }[] = [];
    for (const week of weeksWithEfforts) {
      const upTo = [
        ...baseline,
        ...loggedEfforts
          .filter((e) => e.week <= week)
          .map((e) => ({
            distanceMeters: e.distanceMeters,
            timeSeconds: e.timeSeconds,
          })),
      ];
      const seconds = round(
        bestPredictedRaceTime(upTo, targetDistanceMeters),
      );
      if (seconds !== null) byWeek.push({ week, seconds });
    }

    return { targetDistanceMeters, currentSeconds, byWeek };
  }
}

function round(value: number | null): number | null {
  return value === null ? null : Math.round(value);
}
