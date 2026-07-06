/**
 * Preditor de tempo de prova — fase 1 (fórmula de Riegel).
 *
 * T2 = T1 × (D2 / D1)^1.06
 *
 * Projeta o tempo numa distância alvo a partir de um esforço recente.
 * É uma estimativa estatística, não garantia.
 */
const RIEGEL_EXPONENT = 1.06;

export interface EffortSample {
  distanceMeters: number;
  timeSeconds: number;
}

/** Projeta o tempo (em segundos) para `targetDistanceMeters`. */
export function predictRaceTime(
  sample: EffortSample,
  targetDistanceMeters: number,
): number {
  if (sample.distanceMeters <= 0 || sample.timeSeconds <= 0) {
    throw new Error("Esforço de referência inválido");
  }
  const ratio = targetDistanceMeters / sample.distanceMeters;
  return sample.timeSeconds * Math.pow(ratio, RIEGEL_EXPONENT);
}

/**
 * Usa o melhor (menor tempo projetado) entre vários esforços recentes,
 * dando a estimativa mais otimista sustentada por dados reais.
 */
export function bestPredictedRaceTime(
  samples: EffortSample[],
  targetDistanceMeters: number,
): number | null {
  const predictions = samples
    .filter((s) => s.distanceMeters > 0 && s.timeSeconds > 0)
    .map((s) => predictRaceTime(s, targetDistanceMeters));
  if (predictions.length === 0) return null;
  return Math.min(...predictions);
}
