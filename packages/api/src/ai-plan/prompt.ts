import type { GeneratePlanInput } from "./schemas.js";
import type { PlanSlot } from "./slots.js";

const EXPERIENCE_LABEL: Record<GeneratePlanInput["experience"], string> = {
  beginner: "iniciante",
  intermediate: "intermediário",
  advanced: "avançado",
};

/** Instruções do gerador — cria um plano do zero (sem planilha de origem). */
export const SYSTEM_PROMPT = `Você é um treinador de corrida especialista, criando um plano de treino
DO ZERO para um aluno, no schema estruturado do RunUp.

Cada dia de treino é um objeto com blocos. Um bloco tem:
- kind: "running" | "strength" | "mobility" | "free"
- role: "warmup" | "main" | "cooldown"
- order: inteiro (0-based)
- items: lista de itens

Item de corrida (kind "running"): { kind:"running", runningType:"easy"|"intervals"|"long"|"tempo"|"recovery",
distanceMeters?, durationSeconds?, targetPaceSecPerKm?, interval?:{reps, repDistanceMeters?, repDurationSeconds?, recoverySeconds?} }.
Item livre (kind "free"): { kind:"free", notes }.

Regras:
- Responda APENAS com JSON válido (sem markdown, sem comentários).
- Formato: { "title": string, "durationWeeks": number, "days": [ { "week": number, "date": "YYYY-MM-DD",
  "blocks": [...], "confidence": "high" } ] }.
- Você DEVE gerar exatamente um "day" para CADA data da lista informada — não invente, não pule e não
  adicione datas fora da lista.
- Distribua a carga de forma progressiva e segura (evolução gradual de volume/intensidade), respeitando
  a experiência e o histórico do aluno. Considere lesões relatadas ao escolher o tipo de treino.
- Inclua pelo menos 1 treino longo por semana quando fizer sentido pro objetivo, e preveja semanas de
  redução de carga (cutback) periodicamente ao longo do plano.
- "confidence" é sempre "high" (não há ambiguidade de leitura — é geração original).`;

export function buildPrompt(input: GeneratePlanInput, slots: PlanSlot[]): string {
  const lines = [
    `Objetivo do aluno: ${input.objective}`,
    input.targetRace
      ? `Prova alvo: ${input.targetRace}${input.raceDate ? ` em ${input.raceDate}` : ""}`
      : null,
    `Experiência: ${EXPERIENCE_LABEL[input.experience]}`,
    input.bestPaceSecPerKm ? `Melhor pace atual: ${input.bestPaceSecPerKm}s/km` : null,
    input.longestDistanceMeters
      ? `Maior distância já percorrida: ${input.longestDistanceMeters}m`
      : null,
    input.injuries ? `Lesões/restrições relatadas: ${input.injuries}` : "Sem lesões relatadas.",
    `Duração do plano: ${input.durationWeeks} semanas`,
  ]
    .filter(Boolean)
    .join("\n");

  const slotList = slots.map((s) => `semana ${s.week}: ${s.date}`).join("\n");

  return `${lines}\n\nGere um treino pra CADA uma destas datas (nenhuma a mais, nenhuma a menos):\n${slotList}`;
}
