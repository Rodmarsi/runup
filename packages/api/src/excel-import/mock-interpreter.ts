import type { SpreadsheetInterpreter } from "./interpreter.js";
import type { InterpretedPlan } from "./schema.js";

/**
 * Interpretador de demonstração — retorna um plano fixo sem chamar a IA.
 * Ativado com RUNUP_MOCK_AI=1 para exibir o fluxo de importação sem API key.
 */
export class MockInterpreter implements SpreadsheetInterpreter {
  async interpret(): Promise<InterpretedPlan> {
    return {
      title: "Plano importado (exemplo)",
      durationWeeks: 12,
      days: [
        {
          week: 1,
          date: "2026-07-07",
          dayLabel: "Terça",
          blocks: [
            {
              kind: "running",
              role: "main",
              order: 0,
              items: [
                { kind: "running", runningType: "recovery", distanceMeters: 6000 },
              ],
            },
          ],
          sourceRef: "Plano!B2",
          confidence: "high",
        },
        {
          week: 1,
          date: "2026-07-09",
          dayLabel: "Quinta",
          blocks: [
            {
              kind: "free",
              role: "main",
              order: 0,
              items: [{ kind: "free", notes: "8x2' forte / 1' leve" }],
            },
          ],
          sourceRef: "Plano!B4",
          confidence: "low",
          note: "intervalo por tempo — confirmar interpretação",
        },
        {
          week: 1,
          date: "2026-07-12",
          dayLabel: "Domingo",
          blocks: [
            {
              kind: "running",
              role: "main",
              order: 0,
              items: [
                { kind: "running", runningType: "long", distanceMeters: 14000 },
              ],
            },
          ],
          sourceRef: "Plano!B6",
          confidence: "high",
        },
      ],
    };
  }
}
