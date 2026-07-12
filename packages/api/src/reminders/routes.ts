import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@runup/db";
import { errors } from "../errors.js";
import { ReminderService } from "./service.js";

/**
 * Disparado por um agendador externo (GitHub Actions, ver
 * .github/workflows/reminders.yml) — a API não tem job em segundo plano.
 * Protegido por um segredo compartilhado (INTERNAL_CRON_SECRET), não por
 * login de usuário: quem chama aqui é uma automação, não uma pessoa.
 */
export function reminderRoutes(db: PrismaClient) {
  const reminders = new ReminderService(db);

  return async function (app: FastifyInstance) {
    app.post("/internal/reminders/run", async (request) => {
      const secret = process.env.INTERNAL_CRON_SECRET;
      const provided = request.headers["x-cron-secret"];
      if (!secret || provided !== secret) throw errors.forbidden();
      return reminders.run();
    });
  };
}
