import { AppError } from "../errors.js";
import type { InterpretedPlan } from "../excel-import/schema.js";
import type { GeneratePlanInput } from "./schemas.js";
import type { PlanGenerator } from "./generator.js";
import { computeSlots } from "./slots.js";

export interface AiPlanPreview {
  plan: InterpretedPlan;
  summary: { weeks: number; days: number };
}

export class AiPlanService {
  constructor(private readonly generator: PlanGenerator) {}

  /**
   * Gera um preview do plano — NADA é salvo aqui. As datas são calculadas
   * por nós (determinístico); só o conteúdo de cada dia vem da IA.
   */
  async generate(input: GeneratePlanInput): Promise<AiPlanPreview> {
    const slots = computeSlots(input.startDate, input.durationWeeks, input.availableWeekdays);
    const plan = await this.generator.generate(input, slots);

    const returnedDates = new Set(plan.days.map((d) => d.date));
    const missing = slots.filter((s) => !returnedDates.has(s.date));
    if (missing.length > 0) {
      throw new AppError(
        502,
        "AI_INVALID_OUTPUT",
        `A IA não gerou treino para ${missing.length} data(s) pedida(s)`,
      );
    }

    const weeks = new Set(plan.days.map((d) => d.week)).size;
    return { plan, summary: { weeks, days: plan.days.length } };
  }
}
