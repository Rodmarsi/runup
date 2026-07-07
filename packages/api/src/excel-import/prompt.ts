import { AppError } from "../errors.js";
import type { SheetMatrix } from "./extract.js";
import type { InterpretContext } from "./interpreter.js";

/** Instruções do interpretador — compartilhadas entre provedores de IA. */
export const SYSTEM_PROMPT = `Você é um especialista em treinamento de corrida que converte planilhas
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

/** Monta o prompt do usuário a partir das matrizes extraídas + contexto da meta. */
export function buildPrompt(
  sheets: SheetMatrix[],
  context: InterpretContext,
): string {
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
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new AppError(502, "AI_INVALID_OUTPUT", "A IA não retornou JSON");
  }
  return JSON.parse(raw.slice(start, end + 1));
}
