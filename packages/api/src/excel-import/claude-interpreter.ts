import Anthropic from "@anthropic-ai/sdk";
import { AppError } from "../errors.js";
import type { SheetMatrix } from "./extract.js";
import { interpretedPlanSchema, type InterpretedPlan } from "./schema.js";
import type { InterpretContext, SpreadsheetInterpreter } from "./interpreter.js";

const MODEL = "claude-opus-4-8";

const SYSTEM = `Você é um especialista em treinamento de corrida que converte planilhas
livres de treinadores no schema estruturado do RunUp.

Cada dia de treino vira um objeto com blocos. Um bloco tem:
- kind: "running" | "strength" | "mobility" | "free"
- role: "warmup" | "main" | "cooldown"
- order: inteiro (0-based)
- items: lista de itens

Item de corrida (kind "running"): { kind:"running", runningType:"easy"|"intervals"|"long"|"tempo"|"recovery",
distanceMeters?, durationSeconds?, targetPaceSecPerKm?, interval?:{reps, repDistanceMeters?, repDurationSeconds?, recoverySeconds?} }.
Item livre (kind "free"): { kind:"free", notes }.

Regras:
- Responda APENAS com JSON válido (sem markdown, sem comentários).
- Formato: { "title": string, "durationWeeks": number, "days": [ { "week": number, "date"?: "YYYY-MM-DD",
  "dayLabel"?: string, "blocks": [...], "sourceRef"?: string, "confidence": "high"|"low", "note"?: string } ] }.
- "sourceRef" indica a célula/aba de origem (ex.: "Aba1!B4"). "confidence" é "low" quando você teve dúvida;
  nesse caso explique em "note".
- Se não conseguir interpretar um item, use um bloco "free" com o texto original e confidence "low".`;

export class ClaudeInterpreter implements SpreadsheetInterpreter {
  private readonly client: Anthropic;

  constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
    if (!apiKey) {
      throw new AppError(
        500,
        "AI_NOT_CONFIGURED",
        "Importação por IA indisponível: defina ANTHROPIC_API_KEY",
      );
    }
    this.client = new Anthropic({ apiKey });
  }

  async interpret(
    sheets: SheetMatrix[],
    context: InterpretContext,
  ): Promise<InterpretedPlan> {
    const userPrompt = buildPrompt(sheets, context);

    const stream = this.client.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });
    const message = await stream.finalMessage();

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const json = extractJson(text);
    const parsed = interpretedPlanSchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError(
        502,
        "AI_INVALID_OUTPUT",
        "A IA retornou um plano em formato inesperado",
        parsed.error.flatten(),
      );
    }
    return parsed.data;
  }
}

function buildPrompt(sheets: SheetMatrix[], context: InterpretContext): string {
  const grid = sheets
    .map((s) => {
      const lines = s.rows
        .map((row, i) => `L${i + 1}: ${row.join(" | ")}`)
        .join("\n");
      return `### Aba: ${s.sheetName}\n${lines}`;
    })
    .join("\n\n");

  const goal = context.targetRace
    ? `Prova alvo do aluno: ${context.targetRace}${context.raceDate ? ` em ${context.raceDate}` : ""}.\n\n`
    : "";

  return `${goal}Converta a planilha abaixo no schema do RunUp.\n\n${grid}`;
}

/** Extrai o primeiro objeto JSON do texto (tolera cercas de markdown). */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new AppError(502, "AI_INVALID_OUTPUT", "A IA não retornou JSON");
  }
  return JSON.parse(raw.slice(start, end + 1));
}
