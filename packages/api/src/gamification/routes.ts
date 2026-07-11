import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@runup/db";
import { requireRole } from "../auth/middleware.js";
import { GamificationService } from "./service.js";

export function gamificationRoutes(db: PrismaClient) {
  const gamification = new GamificationService(db);
  const asStudent = { preHandler: requireRole("student") };

  return async function (app: FastifyInstance) {
    app.get("/me/gamification", asStudent, async (request) => {
      return gamification.snapshot(request.authUser!.id);
    });
  };
}
