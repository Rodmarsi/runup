import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@runup/db";
import { requireRole } from "../auth/middleware.js";
import { DataExportService } from "./service.js";

export function dataExportRoutes(db: PrismaClient) {
  const dataExport = new DataExportService(db);
  const asStudent = { preHandler: requireRole("student") };

  return async function (app: FastifyInstance) {
    app.get("/me/export", asStudent, async (request, reply) => {
      const data = await dataExport.exportForStudent(request.authUser!.id);
      reply.header("Content-Disposition", 'attachment; filename="runup-dados.json"');
      return data;
    });
  };
}
