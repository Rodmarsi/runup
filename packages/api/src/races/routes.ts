import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@runup/db";
import { errors } from "../errors.js";
import { requireRole } from "../auth/middleware.js";
import { RaceService } from "./service.js";
import { createRaceSchema, updateRaceSchema } from "./schemas.js";

export function raceRoutes(db: PrismaClient) {
  const races = new RaceService(db);
  const asStudent = { preHandler: requireRole("student") };

  return async function (app: FastifyInstance) {
    app.get("/me/races", asStudent, async (request) => {
      return races.listRaces(request.authUser!.id);
    });

    app.post("/me/races", asStudent, async (request, reply) => {
      const parsed = createRaceSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      const race = await races.createRace(request.authUser!.id, parsed.data);
      reply.status(201).send(race);
    });

    app.patch("/me/races/:id", asStudent, async (request) => {
      const { id } = request.params as { id: string };
      const parsed = updateRaceSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      return races.updateRace(request.authUser!.id, id, parsed.data);
    });

    app.delete("/me/races/:id", asStudent, async (request, reply) => {
      const { id } = request.params as { id: string };
      await races.deleteRace(request.authUser!.id, id);
      reply.status(204).send();
    });
  };
}
