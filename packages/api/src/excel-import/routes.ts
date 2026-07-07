import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@runup/db";
import { z } from "zod";
import { errors } from "../errors.js";
import { requireRole } from "../auth/middleware.js";
import { createPlanSchema } from "../plans/schemas.js";
import { ExcelImportService } from "./service.js";
import { ClaudeInterpreter } from "./claude-interpreter.js";
import type { SpreadsheetInterpreter } from "./interpreter.js";

const importSchema = z.object({
  studentId: z.string(),
  contentBase64: z.string().min(1),
});

/**
 * @param interpreter injeta um interpretador (mock nos testes). Em produção,
 * omitido → cria o ClaudeInterpreter sob demanda (falha limpa sem API key).
 */
export function excelImportRoutes(
  db: PrismaClient,
  interpreter?: SpreadsheetInterpreter,
) {
  const asCoach = { preHandler: requireRole("coach") };
  const resolve = () => interpreter ?? new ClaudeInterpreter();

  return async function (app: FastifyInstance) {
    // Etapa 2 (revisão): sobe a planilha e recebe a interpretação da IA.
    app.post("/coach/import/excel", asCoach, async (request) => {
      const parsed = importSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      const service = new ExcelImportService(db, resolve());
      return service.interpret(
        request.authUser!.id,
        parsed.data.studentId,
        parsed.data.contentBase64,
      );
    });

    // Etapa 5 (confirmar): persiste o plano revisado.
    app.post("/coach/import/excel/confirm", asCoach, async (request, reply) => {
      const parsed = createPlanSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      const service = new ExcelImportService(db, resolve());
      const plan = await service.confirm(request.authUser!.id, parsed.data);
      reply.status(201).send(plan);
    });
  };
}
