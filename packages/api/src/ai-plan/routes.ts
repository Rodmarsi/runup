import type { FastifyInstance } from "fastify";
import { errors } from "../errors.js";
import { requireRole } from "../auth/middleware.js";
import { generatePlanSchema } from "./schemas.js";
import { AiPlanService } from "./service.js";
import { ClaudePlanGenerator } from "./claude-generator.js";
import type { PlanGenerator } from "./generator.js";

/**
 * @param generator injeta um gerador (mock nos testes). Em produção, omitido
 * → cria o ClaudePlanGenerator sob demanda (falha limpa sem API key).
 */
export function aiPlanRoutes(generator?: PlanGenerator) {
  const asStudent = { preHandler: requireRole("student") };
  const resolve = () => generator ?? new ClaudePlanGenerator();

  return async function (app: FastifyInstance) {
    // "Criar com IA": o aluno responde o questionário e recebe um preview —
    // nada é salvo aqui. Confirmar = POST /me/plans com os dias do preview.
    app.post("/me/plans/ai-generate", asStudent, async (request) => {
      const parsed = generatePlanSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      const service = new AiPlanService(resolve());
      return service.generate(parsed.data);
    });
  };
}
