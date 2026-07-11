import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@runup/db";
import { errors } from "../errors.js";
import { requireRole } from "../auth/middleware.js";
import { ProfileService } from "./service.js";
import { bodyMetricSchema, personalRecordSchema, athleteProfileSchema } from "./schemas.js";

export function profileRoutes(db: PrismaClient) {
  const profile = new ProfileService(db);
  const asStudent = { preHandler: requireRole("student") };

  return async function (app: FastifyInstance) {
    app.post("/me/body-metrics", asStudent, async (request, reply) => {
      const parsed = bodyMetricSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      const m = await profile.addBodyMetric(request.authUser!.id, parsed.data);
      reply.status(201).send(m);
    });

    app.get("/me/body-metrics", asStudent, async (request) => {
      return profile.listBodyMetrics(request.authUser!.id);
    });

    app.post("/me/personal-records", asStudent, async (request, reply) => {
      const parsed = personalRecordSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      const pr = await profile.addPersonalRecord(
        request.authUser!.id,
        parsed.data,
      );
      reply.status(201).send(pr);
    });

    app.get("/me/personal-records", asStudent, async (request) => {
      return profile.listPersonalRecords(request.authUser!.id);
    });

    app.get("/me/stats", asStudent, async (request) => {
      return profile.stats(request.authUser!.id);
    });

    app.get("/me/athlete-profile", asStudent, async (request) => {
      const p = await profile.getAthleteProfile(request.authUser!.id);
      return p ?? { studentId: request.authUser!.id };
    });

    app.put("/me/athlete-profile", asStudent, async (request) => {
      const parsed = athleteProfileSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      return profile.upsertAthleteProfile(request.authUser!.id, parsed.data);
    });
  };
}
