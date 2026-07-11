import type { InterpretedPlan } from "../excel-import/schema.js";
import type { GeneratePlanInput } from "./schemas.js";
import type { PlanSlot } from "./slots.js";
import type { PlanGenerator } from "./generator.js";

/**
 * Gerador de demonstração — preenche as datas pedidas com um treino fixo,
 * sem chamar IA. Ativado com RUNUP_MOCK_AI=1.
 */
export class MockPlanGenerator implements PlanGenerator {
  async generate(input: GeneratePlanInput, slots: PlanSlot[]): Promise<InterpretedPlan> {
    return {
      title: `Plano gerado por IA — ${input.objective}`,
      durationWeeks: input.durationWeeks,
      days: slots.map((s) => ({
        week: s.week,
        date: s.date,
        blocks: [
          {
            kind: "running",
            role: "main",
            order: 0,
            items: [{ kind: "running", runningType: "easy", distanceMeters: 6000 }],
          },
        ],
        confidence: "high",
      })),
    };
  }
}
