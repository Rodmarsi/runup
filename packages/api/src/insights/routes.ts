import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@runup/db";
import { requireRole } from "../auth/middleware.js";
import { InsightsService } from "./service.js";

export function insightsRoutes(db: PrismaClient) {
  const insights = new InsightsService(db);
  const asStudent = { preHandler: requireRole("student") };

  return async function (app: FastifyInstance) {
    app.get("/me/insights", asStudent, async (request) => {
      return insights.forStudent(request.authUser!.id);
    });

    app.get("/me/race-predictions", asStudent, async (request) => {
      return insights.racePredictions(request.authUser!.id);
    });
  };
}
