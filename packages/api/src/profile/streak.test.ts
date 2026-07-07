import { describe, it, expect } from "vitest";
import { computeStreak } from "./streak.js";

const d = (s: string) => new Date(`${s}T12:00:00Z`);
const today = d("2026-07-07");

describe("computeStreak", () => {
  it("zero sem atividade", () => {
    expect(computeStreak([], today)).toBe(0);
  });

  it("conta dias consecutivos terminando hoje", () => {
    const dates = [d("2026-07-05"), d("2026-07-06"), d("2026-07-07")];
    expect(computeStreak(dates, today)).toBe(3);
  });

  it("mantém a streak se o último dia foi ontem", () => {
    expect(computeStreak([d("2026-07-05"), d("2026-07-06")], today)).toBe(2);
  });

  it("quebra se o último dia foi anteontem", () => {
    expect(computeStreak([d("2026-07-04"), d("2026-07-05")], today)).toBe(0);
  });

  it("ignora múltiplas atividades no mesmo dia", () => {
    const dates = [d("2026-07-07"), d("2026-07-07"), d("2026-07-06")];
    expect(computeStreak(dates, today)).toBe(2);
  });

  it("para na primeira lacuna", () => {
    const dates = [d("2026-07-07"), d("2026-07-06"), d("2026-07-03")];
    expect(computeStreak(dates, today)).toBe(2);
  });
});
