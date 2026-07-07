import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@runup/db";
import { z } from "zod";
import { errors } from "../errors.js";
import { requireRole } from "../auth/middleware.js";
import { StravaService } from "./service.js";
import { HttpStravaClient } from "./http-client.js";
import type { StravaClient } from "./client.js";

const connectSchema = z.object({ code: z.string().min(1) });

/**
 * @param client injeta o cliente Strava (mock nos testes). Em produção,
 * omitido → cria o HttpStravaClient sob demanda (falha limpa sem credenciais).
 */
export function stravaRoutes(db: PrismaClient, client?: StravaClient) {
  const asStudent = { preHandler: requireRole("student") };
  const service = () => new StravaService(db, client ?? new HttpStravaClient());

  return async function (app: FastifyInstance) {
    app.get("/me/strava", asStudent, async (request) => {
      const conn = await db.stravaConnection.findUnique({
        where: { studentId: request.authUser!.id },
      });
      return { connected: Boolean(conn), athleteId: conn?.athleteId ?? null };
    });

    app.post("/me/strava/connect", asStudent, async (request, reply) => {
      const parsed = connectSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      await service().connect(request.authUser!.id, parsed.data.code);
      reply.status(204).send();
    });

    app.post("/me/strava/sync", asStudent, async (request) => {
      return service().sync(request.authUser!.id);
    });

    app.delete("/me/strava", asStudent, async (request, reply) => {
      await service().disconnect(request.authUser!.id);
      reply.status(204).send();
    });
  };
}
