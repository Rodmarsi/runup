import "dotenv/config";
import { buildApp } from "./app.js";
import { MockInterpreter } from "./excel-import/mock-interpreter.js";
import { GeminiInterpreter } from "./excel-import/gemini-interpreter.js";
import type { SpreadsheetInterpreter } from "./excel-import/interpreter.js";
import { MockPlanGenerator } from "./ai-plan/mock-generator.js";
import { GeminiPlanGenerator } from "./ai-plan/gemini-generator.js";
import type { PlanGenerator } from "./ai-plan/generator.js";

/**
 * Provedor de IA do import de Excel, por prioridade:
 * RUNUP_MOCK_AI=1 → exemplo fixo · ANTHROPIC_API_KEY → Claude (padrão das
 * rotas) · GEMINI_API_KEY → Gemini (camada gratuita).
 */
function resolveInterpreter(): SpreadsheetInterpreter | undefined {
  if (process.env.RUNUP_MOCK_AI) return new MockInterpreter();
  if (process.env.ANTHROPIC_API_KEY) return undefined; // rotas criam o ClaudeInterpreter
  if (process.env.GEMINI_API_KEY) return new GeminiInterpreter();
  return undefined;
}

/** Mesma prioridade do import de Excel, pro "Criar com IA" do aluno. */
function resolveAiPlanGenerator(): PlanGenerator | undefined {
  if (process.env.RUNUP_MOCK_AI) return new MockPlanGenerator();
  if (process.env.ANTHROPIC_API_KEY) return undefined; // rotas criam o ClaudePlanGenerator
  if (process.env.GEMINI_API_KEY) return new GeminiPlanGenerator();
  return undefined;
}

const app = buildApp({
  interpreter: resolveInterpreter(),
  aiPlanGenerator: resolveAiPlanGenerator(),
});
const port = Number(process.env.PORT ?? 3333);

app
  .listen({ port, host: "0.0.0.0" })
  .then(() => {
    app.log.info(`RunUp API em http://localhost:${port}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
