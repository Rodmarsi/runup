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
- VARIE o runningType ao longo da semana — NUNCA gere todos os dias como "easy". Uma semana de
  treino real de corredor mistura: 1 "long" (o longão, o mais longo da semana), 1-2 "easy" (rodagem,
  ritmo confortável, a maioria dos dias), e — dependendo da experiência e fase do plano —
  "intervals" (tiros, séries curtas e rápidas com recuperação) e/ou "tempo" (fartlek/ritmo forte
  sustentado) pra estimular VO2 max e limiar. "recovery" é pra dias de trote bem leve após esforço
  alto. Um plano onde todo dia é "easy" está errado — varie de verdade.
- TODO item de corrida (kind "running"), em QUALQUER bloco (warmup, main, cooldown), DEVE vir com
  distanceMeters OU durationSeconds preenchido — e, quando fizer sentido pro tipo de treino,
  targetPaceSecPerKm também. Nunca deixe um item de corrida sem nenhum desses campos, mesmo que seja
  um valor padrão (ex.: aquecimento/desaquecimento ~1000m de trote leve).
- Aquecimento, principal e desaquecimento são fases DIFERENTES do treino — nunca gere os três com o
  mesmo conteúdo (mesma distância/pace/tipo). O principal é o foco do dia (o que muda conforme o
  objetivo/periodização); aquecimento e desaquecimento são sempre mais curtos e mais leves que o
  principal.
- "confidence" é sempre "high" (não há ambiguidade de leitura — é geração original).`;

const WEEKDAY_NAME = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function buildPrompt(input: GeneratePlanInput, slots: PlanSlot[]): string {
  const longRunDates =
    input.longRunWeekday !== undefined
      ? slots.filter((s) => s.weekday === input.longRunWeekday).map((s) => s.date)
      : [];

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
    input.longRunWeekday !== undefined
      ? `O aluno quer o treino longo (runningType "long") sempre no(a) ${WEEKDAY_NAME[input.longRunWeekday]}. ` +
        `Nas datas abaixo marcadas como "longão", o bloco principal DEVE ser runningType "long": ` +
        `${longRunDates.join(", ")}.`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const slotList = slots
    .map((s) => `semana ${s.week}: ${s.date}${longRunDates.includes(s.date) ? " (longão)" : ""}`)
    .join("\n");

  return `${lines}\n\nGere um treino pra CADA uma destas datas (nenhuma a mais, nenhuma a menos):\n${slotList}`;
}
