import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@runup/db";
import { errors } from "../errors.js";
import { requireRole } from "../auth/middleware.js";
import { CoachingService } from "./service.js";
import { SubscriptionService } from "./subscription-service.js";
import { AdherenceService } from "./adherence-service.js";
import { ProfileService } from "../profile/service.js";
import { GoalService } from "../plans/goal-service.js";
import { PlanService } from "../plans/service.js";
import { inviteSchema, upgradeSchema } from "./schemas.js";

export function coachingRoutes(db: PrismaClient) {
  const coaching = new CoachingService(db);
  const subscriptions = new SubscriptionService(db);
  const adherence = new AdherenceService(db);
  const profiles = new ProfileService(db);
  const goals = new GoalService(db);
  const plans = new PlanService(db);
  const asCoach = { preHandler: requireRole("coach") };
  const asStudent = { preHandler: requireRole("student") };

  /** Confirma que o treinador tem vínculo ativo com o aluno. */
  async function assertActiveLink(coachId: string, studentId: string) {
    const link = await db.coachStudent.findUnique({
      where: { coachId_studentId: { coachId, studentId } },
    });
    if (!link || link.status !== "active") throw errors.notLinked();
  }

  return async function (app: FastifyInstance) {
    // --- Treinador ---
    app.post("/coach/students/invite", asCoach, async (request, reply) => {
      const parsed = inviteSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      const link = await coaching.invite(
        request.authUser!.id,
        parsed.data.studentEmail,
      );
      reply.status(201).send(link);
    });

    app.get("/coach/students", asCoach, async (request) => {
      return coaching.listForCoach(request.authUser!.id);
    });

    app.get("/coach/subscription", asCoach, async (request) => {
      return subscriptions.view(request.authUser!.id);
    });

    app.get("/coach/alerts", asCoach, async (request) => {
      return adherence.coachAlerts(request.authUser!.id);
    });

    // Visão de um aluno vinculado: perfil, stats, metas e treinos.
    app.get("/coach/students/:id/overview", asCoach, async (request) => {
      const { id } = request.params as { id: string };
      const coachId = request.authUser!.id;
      await assertActiveLink(coachId, id);
      const [student, stats, studentGoals, days] = await Promise.all([
        db.user.findUnique({
          where: { id },
          select: { id: true, name: true, email: true, avatarUrl: true },
        }),
        profiles.stats(id),
        goals.listForStudent(id),
        plans.calendarForStudent(id),
      ]);
      return { student, stats, goals: studentGoals, days };
    });

    app.post("/coach/subscription/upgrade", asCoach, async (request) => {
      const parsed = upgradeSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      return subscriptions.setTier(request.authUser!.id, parsed.data.tier);
    });

    // --- Aluno ---
    app.get("/student/invites", asStudent, async (request) => {
      return coaching.pendingForStudent(request.authUser!.id);
    });

    app.post("/student/invites/:id/accept", asStudent, async (request) => {
      const { id } = request.params as { id: string };
      return coaching.accept(request.authUser!.id, id);
    });

    app.post("/student/invites/:id/decline", asStudent, async (request) => {
      const { id } = request.params as { id: string };
      return coaching.decline(request.authUser!.id, id);
    });
  };
}
