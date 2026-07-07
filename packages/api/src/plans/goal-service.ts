import type { PrismaClient } from "@runup/db";
import { errors } from "../errors.js";
import type { CreateGoalInput } from "./schemas.js";

export interface WeekSummary {
  week: number;
  totalDays: number;
  completedDays: number;
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
    };
  }
}
