import { describe, it, expect } from "vitest";
import { interpretedPlanSchema } from "./schema.js";

const validDay = {
  week: 1,
  blocks: [
    {
      kind: "running",
      role: "main",
      order: 0,
      items: [{ kind: "running", runningType: "easy", distanceMeters: 6000 }],
    },
  ],
  confidence: "high",
};

describe("interpretedPlanSchema", () => {
  it("aceita um plano bem formado", () => {
    const res = interpretedPlanSchema.safeParse({
      title: "Plano",
      durationWeeks: 12,
      days: [validDay],
    });
    expect(res.success).toBe(true);
  });

  it("rejeita confidence inválido (contrato da IA)", () => {
    const res = interpretedPlanSchema.safeParse({
      title: "Plano",
      durationWeeks: 12,
      days: [{ ...validDay, confidence: "maybe" }],
    });
    expect(res.success).toBe(false);
  });

  it("rejeita bloco com kind desconhecido", () => {
    const res = interpretedPlanSchema.safeParse({
      title: "Plano",
      durationWeeks: 12,
      days: [
        { ...validDay, blocks: [{ kind: "yoga", role: "main", order: 0, items: [] }] },
      ],
    });
    expect(res.success).toBe(false);
  });
});
