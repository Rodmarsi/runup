import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@runup/db";
import { errors } from "../errors.js";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { PlanService } from "./service.js";
import { GoalService } from "./goal-service.js";
import {
  createPlanSchema,
  createSelfPlanSchema,
  logWorkoutSchema,
  logStandaloneWorkoutSchema,
  listWorkoutLogsQuerySchema,
  updateDaySchema,
  duplicateDaySchema,
  commentSchema,
  createGoalSchema,
} from "./schemas.js";

export function planRoutes(db: PrismaClient) {
  const plans = new PlanService(db);
  const goals = new GoalService(db);
  const asCoach = { preHandler: requireRole("coach") };
  const asStudent = { preHandler: requireRole("student") };
  const authed = { preHandler: requireAuth };

  return async function (app: FastifyInstance) {
    // Treinador cria e atribui um plano a um aluno vinculado.
    app.post("/plans", asCoach, async (request, reply) => {
      const parsed = createPlanSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      const plan = await plans.createPlan(request.authUser!.id, parsed.data);
      reply.status(201).send(plan);
    });

    // Aluno cria o próprio plano (manual ou confirmando o preview da IA).
    app.post("/me/plans", asStudent, async (request, reply) => {
      const parsed = createSelfPlanSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      const plan = await plans.createSelfPlan(request.authUser!.id, parsed.data);
      reply.status(201).send(plan);
    });

    // Calendário do aluno (seus dias de treino).
    app.get("/me/calendar", asStudent, async (request) => {
      return plans.calendarForStudent(request.authUser!.id);
    });

    // Detalhe de um dia (aluno dono ou treinador vinculado).
    app.get("/workout-days/:id", authed, async (request) => {
      const { id } = request.params as { id: string };
      const { id: userId, role } = request.authUser!;
      return plans.getDay(userId, role, id);
    });

    // Aluno registra a execução (check-in com feedback).
    app.post("/workout-days/:id/log", asStudent, async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = logWorkoutSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      const log = await plans.logWorkout(request.authUser!.id, id, parsed.data);
      reply.status(201).send(log);
    });

    // Aluno registra um treino avulso, sem estar ligado a um dia de plano.
    app.post("/me/workout-logs", asStudent, async (request, reply) => {
      const parsed = logStandaloneWorkoutSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      const log = await plans.logStandaloneWorkout(request.authUser!.id, parsed.data);
      reply.status(201).send(log);
    });

    // Histórico de atividades do aluno (filtro opcional por tipo e por data).
    app.get("/me/workout-logs", asStudent, async (request) => {
      const parsed = listWorkoutLogsQuerySchema.safeParse(request.query);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      return plans.listWorkoutLogs(request.authUser!.id, parsed.data);
    });

    // Treinador move a data ou cancela ("skipped") um dia já criado.
    app.patch("/workout-days/:id", asCoach, async (request) => {
      const { id } = request.params as { id: string };
      const parsed = updateDaySchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      return plans.updateDay(request.authUser!.id, id, parsed.data);
    });

    // Treinador duplica um dia (mesmos blocos) pra outra data.
    app.post("/workout-days/:id/duplicate", asCoach, async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = duplicateDaySchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      const day = await plans.duplicateDay(request.authUser!.id, id, parsed.data);
      reply.status(201).send(day);
    });

    // Comentário num dia (treinador ou aluno do vínculo).
    app.post("/workout-days/:id/comments", authed, async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = commentSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      const { id: userId, role } = request.authUser!;
      const comment = await plans.addComment(userId, role, id, parsed.data.text);
      reply.status(201).send(comment);
    });

    // Metas.
    app.post("/goals", authed, async (request, reply) => {
      const parsed = createGoalSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      const { id: userId, role } = request.authUser!;
      const goal = await goals.createGoal(userId, role, parsed.data);
      reply.status(201).send(goal);
    });

    app.get("/me/goals", asStudent, async (request) => {
      return goals.listForStudent(request.authUser!.id);
    });

    app.get("/goals/:id/overview", authed, async (request) => {
      const { id } = request.params as { id: string };
      const { id: userId, role } = request.authUser!;
      return goals.overview(userId, role, id);
    });
  };
}
