import type { InterpretedPlan } from "../excel-import/schema.js";
import type { GeneratePlanInput } from "./schemas.js";
import type { PlanSlot } from "./slots.js";

/**
 * Interface do gerador de planos por IA. Isola a chamada de IA para que o
 * resto do pipeline seja testável com um mock (sem credenciais).
 */
export interface PlanGenerator {
  generate(input: GeneratePlanInput, slots: PlanSlot[]): Promise<InterpretedPlan>;
}
