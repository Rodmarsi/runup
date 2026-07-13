import type { PrismaClient } from "@runup/db";
import { bestPredictedRaceTime, type EffortSample } from "@runup/core";

export type InsightSeverity = "info" | "warning" | "success";

export interface Insight {
  id: string;
  message: string;
  severity: InsightSeverity;
}

export interface RacePrediction {
  distance: string;
  targetDistanceMeters: number;
  predictedSeconds: number | null;
}

/** Distâncias-alvo da previsão — inclui 15k, que não é uma "prova oficial" do resto do app. */
const PREDICTION_TARGETS: { distance: string; meters: number }[] = [
  { distance: "5k", meters: 5_000 },
  { distance: "10k", meters: 10_000 },
  { distance: "15k", meters: 15_000 },
  { distance: "21k", meters: 21_097 },
  { distance: "42k", meters: 42_195 },
];
/** Ignora esforços curtos demais (ex.: tiros) — distorcem a extrapolação de Riegel. */
const MIN_SAMPLE_METERS = 1_500;
const LOOKBACK_DAYS = 90;

function startOfWeek(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = (d.getUTCDay() + 6) % 7; // segunda = 0
  d.setUTCDate(d.getUTCDate() - day);
  return d;
}

/**
 * Insights derivados por regra a partir dos dados que já temos (sem chamar
 * um LLM a cada carregamento de tela — mais rápido, grátis e previsível).
 */
export class InsightsService {
  constructor(private readonly db: PrismaClient) {}

  async forStudent(studentId: string, now: Date = new Date()): Promise<Insight[]> {
    const insights: Insight[] = [];

    const thisWeekStart = startOfWeek(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7);

    const [thisWeek, lastWeek, shoes] = await Promise.all([
      this.db.workoutLog.aggregate({
        where: { studentId, completedAt: { gte: thisWeekStart } },
        _sum: { distanceMeters: true, durationSeconds: true },
      }),
      this.db.workoutLog.aggregate({
        where: { studentId, completedAt: { gte: lastWeekStart, lt: thisWeekStart } },
        _sum: { distanceMeters: true, durationSeconds: true },
      }),
      this.db.shoe.findMany({
        where: { studentId, retiredAt: null, alertKm: { not: null } },
      }),
    ]);

    const thisDist = thisWeek._sum.distanceMeters ?? 0;
    const lastDist = lastWeek._sum.distanceMeters ?? 0;
    const thisTime = thisWeek._sum.durationSeconds ?? 0;
    const lastTime = lastWeek._sum.durationSeconds ?? 0;

    if (lastDist > 0) {
      const deltaPct = Math.round(((thisDist - lastDist) / lastDist) * 100);
      if (deltaPct >= 30) {
        insights.push({
          id: "load-spike",
          message: `Seu volume aumentou ${deltaPct}% em relação à semana passada — cuidado com a carga.`,
          severity: "warning",
        });
      } else if (deltaPct >= 10) {
        insights.push({
          id: "load-up",
          message: `Você treinou ${deltaPct}% mais essa semana que a passada. Bom trabalho!`,
          severity: "success",
        });
      } else if (deltaPct <= -30) {
        insights.push({
          id: "load-drop",
          message: `Seu volume caiu ${Math.abs(deltaPct)}% em relação à semana passada.`,
          severity: "info",
        });
      }
    }

    if (thisDist > 0 && lastDist > 0 && thisTime > 0 && lastTime > 0) {
      const thisPace = thisTime / (thisDist / 1000);
      const lastPace = lastTime / (lastDist / 1000);
      const paceDeltaPct = Math.round(((lastPace - thisPace) / lastPace) * 100);
      if (paceDeltaPct >= 5) {
        insights.push({
          id: "pace-improved",
          message: `Você correu ${paceDeltaPct}% mais rápido que a semana passada.`,
          severity: "success",
        });
      }
    }

    for (const shoe of shoes) {
      if (shoe.alertKm && shoe.totalKm >= shoe.alertKm) {
        insights.push({
          id: `shoe-${shoe.id}`,
          message: `Seu tênis "${shoe.name}" já tem ${Math.round(shoe.totalKm)} km — considere trocar.`,
          severity: "warning",
        });
      }
    }

    return insights;
  }

  /** Previsão de tempo (Riegel) pras distâncias 5k/10k/15k/21k/42k, com base nas últimas corridas. */
  async racePredictions(studentId: string, now: Date = new Date()): Promise<RacePrediction[]> {
    const since = new Date(now);
    since.setDate(since.getDate() - LOOKBACK_DAYS);

    const logs = await this.db.workoutLog.findMany({
      where: {
        studentId,
        kind: "running",
        completedAt: { gte: since },
        distanceMeters: { gte: MIN_SAMPLE_METERS },
        durationSeconds: { not: null },
      },
      select: { distanceMeters: true, durationSeconds: true },
    });

    const samples: EffortSample[] = logs
      .filter((l) => l.distanceMeters !== null && l.durationSeconds !== null)
      .map((l) => ({ distanceMeters: l.distanceMeters!, timeSeconds: l.durationSeconds! }));

    return PREDICTION_TARGETS.map(({ distance, meters }) => {
      const predicted = bestPredictedRaceTime(samples, meters);
      return {
        distance,
        targetDistanceMeters: meters,
        predictedSeconds: predicted === null ? null : Math.round(predicted),
      };
    });
  }
}
