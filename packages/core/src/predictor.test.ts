import { describe, it, expect } from "vitest";
import { predictRaceTime, bestPredictedRaceTime } from "./predictor.js";
import { formatDuration } from "./format.js";

describe("predictRaceTime (Riegel)", () => {
  it("projeta a maratona a partir de um 10k de 47:12", () => {
    // 10k em 2832s → maratona ~ 3h37 pela fórmula de Riegel.
    const marathon = predictRaceTime(
      { distanceMeters: 10_000, timeSeconds: 2832 },
      42_195,
    );
    expect(formatDuration(marathon)).toBe("3h37");
  });

  it("mesma distância retorna o mesmo tempo", () => {
    const t = predictRaceTime(
      { distanceMeters: 5_000, timeSeconds: 1500 },
      5_000,
    );
    expect(Math.round(t)).toBe(1500);
  });

  it("rejeita esforço inválido", () => {
    expect(() =>
      predictRaceTime({ distanceMeters: 0, timeSeconds: 100 }, 5_000),
    ).toThrow();
  });
});

describe("bestPredictedRaceTime", () => {
  it("escolhe a projeção mais rápida entre esforços", () => {
    const best = bestPredictedRaceTime(
      [
        { distanceMeters: 5_000, timeSeconds: 1500 },
        { distanceMeters: 10_000, timeSeconds: 2832 },
      ],
      21_097,
    );
    expect(best).not.toBeNull();
  });

  it("retorna null sem esforços válidos", () => {
    expect(bestPredictedRaceTime([], 21_097)).toBeNull();
  });
});
