import type { PrismaClient } from "@runup/db";
import type { Block, BlockKind } from "@runup/types";
import { errors } from "../errors.js";
import { GamificationService } from "../gamification/service.js";
import { NotificationService } from "../notifications/service.js";
import type {
  CreatePlanInput,
  CreateSelfPlanInput,
  LogWorkoutInput,
  LogStandaloneWorkoutInput,
  ListWorkoutLogsQuery,
  UpdateDayInput,
  DuplicateDayInput,
} from "./schemas.js";

/** Frequência (pico semanal) e distribuição por tipo — pra tela "Visão geral do plano". */
function summarizePlanDays(days: { week: number; blocks: unknown }[]) {
  const perWeek = new Map<number, number>();
  const kindCounts = new Map<BlockKind, number>();

  for (const day of days) {
    perWeek.set(day.week, (perWeek.get(day.week) ?? 0) + 1);

    const blocks = day.blocks as unknown as Block[];
    const main = blocks.find((b) => b.role === "main") ?? blocks[0];
    if (main) kindCounts.set(main.kind, (kindCounts.get(main.kind) ?? 0) + 1);
  }

  return {
    workoutsPerWeek: perWeek.size > 0 ? Math.max(...perWeek.values()) : 0,
    kindBreakdown: [...kindCounts.entries()].map(([kind, count]) => ({ kind, count })),
  };
}

export class PlanService {
  private readonly gamification: GamificationService;
  private readonly notifications: NotificationService;

  constructor(private readonly db: PrismaClient) {
    this.gamification = new GamificationService(db);
    this.notifications = new NotificationService(db);
  }

  /** Garante que o treinador tem vínculo ativo com o aluno. */
  private async assertActiveLink(coachId: string, studentId: string) {
    const link = await this.db.coachStudent.findUnique({
      where: { coachId_studentId: { coachId, studentId } },
    });
    if (!link || link.status !== "active") throw errors.notLinked();
  }

  /** Garante que o dia pertence a um plano do treinador, com vínculo ativo com o(s) aluno(s). */
  private async assertCoachOwnsDay(coachId: string, dayId: string) {
    const day = await this.db.workoutDay.findUnique({
      where: { id: dayId },
      include: { plan: { include: { assignments: true } } },
    });
    if (!day) throw errors.dayNotFound();
    if (day.plan.ownerId !== coachId) throw errors.dayNotFound();
    for (const a of day.plan.assignments) {
      await this.assertActiveLink(coachId, a.studentId);
    }
    return day;
  }

  /** Move a data ou muda o status (ex.: cancelar → "skipped") de um dia já criado. */
  async updateDay(coachId: string, dayId: string, input: UpdateDayInput) {
    await this.assertCoachOwnsDay(coachId, dayId);
    return this.db.workoutDay.update({
      where: { id: dayId },
      data: {
        date: input.date ? new Date(input.date) : undefined,
        status: input.status,
      },
    });
  }

  /** Duplica um dia (mesmos blocos) pra outra data, no mesmo plano. */
  async duplicateDay(coachId: string, dayId: string, input: DuplicateDayInput) {
    const day = await this.assertCoachOwnsDay(coachId, dayId);
    return this.db.workoutDay.create({
      data: {
        planId: day.planId,
        week: day.week,
        date: new Date(input.date),
        blocks: day.blocks as object,
      },
    });
  }

  /**
   * Treinador cria um plano para um aluno vinculado, com seus dias/blocos,
   * e já atribui (PlanAssignment). Tudo numa transação.
   */
  async createPlan(coachId: string, input: CreatePlanInput) {
    await this.assertActiveLink(coachId, input.studentId);

    const plan = await this.db.$transaction(async (tx) => {
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
    await this.notifications.send(
      input.studentId,
      "Novo treino!",
      `Seu treinador enviou o plano "${plan.title}".`,
    );
    return plan;
  }

  /**
   * O aluno cria seu próprio plano (manual ou confirmado a partir do preview
   * do "Criar com IA") — vira dono E atribuído, sem depender de um treinador.
   */
  async createSelfPlan(studentId: string, input: CreateSelfPlanInput) {
    return this.db.$transaction(async (tx) => {
      const plan = await tx.plan.create({
        data: {
          ownerId: studentId,
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
          studentId,
          startDate: new Date(input.days[0]!.date),
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

  /** Plano mais recente do aluno, com quem o criou (treinador ou o próprio aluno). */
  async currentPlanForStudent(studentId: string) {
    const assignment = await this.db.planAssignment.findFirst({
      where: { studentId },
      orderBy: { plan: { createdAt: "desc" } },
      include: { plan: { include: { owner: true, workoutDays: true } } },
    });
    if (!assignment) return null;

    const { plan } = assignment;
    const madeByCoach = plan.ownerId !== studentId;
    const { workoutsPerWeek, kindBreakdown } = summarizePlanDays(plan.workoutDays);

    return {
      id: plan.id,
      title: plan.title,
      durationWeeks: plan.durationWeeks,
      createdAt: plan.createdAt,
      madeByCoach,
      coachName: madeByCoach ? plan.owner.name : null,
      totalWorkouts: plan.workoutDays.length,
      workoutsPerWeek,
      kindBreakdown,
    };
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

    const log = await this.db.$transaction(async (tx) => {
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
    await this.gamification.onWorkoutLogged(studentId, log.distanceMeters);
    return log;
  }

  /** Treino avulso — o aluno registra algo que fez sem estar num dia de plano. */
  async logStandaloneWorkout(studentId: string, input: LogStandaloneWorkoutInput) {
    const log = await this.db.workoutLog.create({
      data: {
        studentId,
        source: "manual",
        kind: input.kind,
        distanceMeters: input.distanceMeters,
        durationSeconds: input.durationSeconds,
        perceivedEffort: input.perceivedEffort,
        pain: input.pain,
        notes: input.notes,
      },
    });
    await this.gamification.onWorkoutLogged(studentId, log.distanceMeters);
    return log;
  }

  /** Histórico de atividades (Strava + registradas manualmente) do aluno. */
  listWorkoutLogs(studentId: string, query: ListWorkoutLogsQuery) {
    return this.db.workoutLog.findMany({
      where: {
        studentId,
        kind: query.kind,
        completedAt: query.since ? { gte: new Date(query.since) } : undefined,
      },
      orderBy: { completedAt: "desc" },
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

    const comment = await this.db.workoutComment.create({
      data: { workoutDayId: dayId, authorId: userId, text },
    });

    // Notifica a outra parte do vínculo (dono do plano ou aluno atribuído).
    const recipients = new Set(
      [day.plan.ownerId, ...day.plan.assignments.map((a) => a.studentId)].filter(
        (id) => id !== userId,
      ),
    );
    for (const recipientId of recipients) {
      await this.notifications.send(recipientId, "Novo comentário", text.slice(0, 100));
    }

    return comment;
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
