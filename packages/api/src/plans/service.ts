import type { PrismaClient } from "@runup/db";
import { errors } from "../errors.js";
import type { CreatePlanInput, LogWorkoutInput } from "./schemas.js";

export class PlanService {
  constructor(private readonly db: PrismaClient) {}

  /** Garante que o treinador tem vínculo ativo com o aluno. */
  private async assertActiveLink(coachId: string, studentId: string) {
    const link = await this.db.coachStudent.findUnique({
      where: { coachId_studentId: { coachId, studentId } },
    });
    if (!link || link.status !== "active") throw errors.notLinked();
  }

  /**
   * Treinador cria um plano para um aluno vinculado, com seus dias/blocos,
   * e já atribui (PlanAssignment). Tudo numa transação.
   */
  async createPlan(coachId: string, input: CreatePlanInput) {
    await this.assertActiveLink(coachId, input.studentId);

    return this.db.$transaction(async (tx) => {
      const plan = await tx.plan.create({
        data: {
          ownerId: coachId,
          type: "custom",
          title: input.title,
          durationWeeks: input.durationWeeks,
        },
      });

      await tx.workoutDay.createMany({
        data: input.days.map((d) => ({
          planId: plan.id,
          week: d.week,
          date: new Date(d.date),
          blocks: d.blocks,
        })),
      });

      await tx.planAssignment.create({
        data: {
          planId: plan.id,
          studentId: input.studentId,
          startDate: new Date(input.startDate),
        },
      });

      return plan;
    });
  }

  /** Calendário do aluno: dias de treino dos planos atribuídos a ele. */
  async calendarForStudent(studentId: string) {
    const assignments = await this.db.planAssignment.findMany({
      where: { studentId },
      select: { planId: true },
    });
    const planIds = assignments.map((a) => a.planId);
    if (planIds.length === 0) return [];

    return this.db.workoutDay.findMany({
      where: { planId: { in: planIds } },
      orderBy: { date: "asc" },
    });
  }

  /**
   * Lê um dia de treino, garantindo acesso: o aluno dono ou o treinador
   * vinculado a ele.
   */
  async getDay(userId: string, role: "student" | "coach", dayId: string) {
    const day = await this.db.workoutDay.findUnique({
      where: { id: dayId },
      include: {
        plan: { include: { assignments: true } },
        comments: { orderBy: { createdAt: "asc" } },
        logs: true,
      },
    });
    if (!day) throw errors.dayNotFound();

    await this.assertDayAccess(userId, role, day.plan.assignments, day.plan.ownerId);
    return day;
  }

  /** Aluno registra a execução de um dia (check-in com feedback). */
  async logWorkout(studentId: string, dayId: string, input: LogWorkoutInput) {
    const day = await this.db.workoutDay.findUnique({
      where: { id: dayId },
      include: { plan: { include: { assignments: true } } },
    });
    if (!day) throw errors.dayNotFound();
    const isOwner = day.plan.assignments.some((a) => a.studentId === studentId);
    if (!isOwner) throw errors.dayNotFound();

    return this.db.$transaction(async (tx) => {
      await tx.workoutDay.update({
        where: { id: dayId },
        data: { status: input.status },
      });
      return tx.workoutLog.create({
        data: {
          workoutDayId: dayId,
          studentId,
          source: input.source,
          distanceMeters: input.distanceMeters,
          durationSeconds: input.durationSeconds,
          avgPaceSecPerKm: input.avgPaceSecPerKm,
          avgHeartRate: input.avgHeartRate,
          cadence: input.cadence,
          elevationGainM: input.elevationGainM,
          splits: input.splits,
          perceivedEffort: input.perceivedEffort,
          pain: input.pain,
          notes: input.notes,
        },
      });
    });
  }

  /** Comentário contextualizado num dia (treinador ou aluno do vínculo). */
  async addComment(
    userId: string,
    role: "student" | "coach",
    dayId: string,
    text: string,
  ) {
    const day = await this.db.workoutDay.findUnique({
      where: { id: dayId },
      include: { plan: { include: { assignments: true } } },
    });
    if (!day) throw errors.dayNotFound();
    await this.assertDayAccess(userId, role, day.plan.assignments, day.plan.ownerId);

    return this.db.workoutComment.create({
      data: { workoutDayId: dayId, authorId: userId, text },
    });
  }

  private async assertDayAccess(
    userId: string,
    role: "student" | "coach",
    assignments: { studentId: string }[],
    ownerId: string,
  ) {
    if (role === "student") {
      if (!assignments.some((a) => a.studentId === userId)) {
        throw errors.dayNotFound();
      }
      return;
    }
    // Treinador: precisa ser o dono do plano E ter vínculo ativo com o aluno.
    if (ownerId !== userId) throw errors.dayNotFound();
    for (const a of assignments) {
      await this.assertActiveLink(userId, a.studentId);
    }
  }
}
