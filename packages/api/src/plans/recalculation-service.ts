import type { PrismaClient } from "@runup/db";
import type { Block, BlockItem, RunningItem } from "@runup/types";

/** Janela antes da prova em que o plano é ajustado (taper). */
const TAPER_WINDOW_DAYS = 10;

function isRunningItem(item: BlockItem): item is RunningItem {
  return item.kind === "running";
}

/** Reduz distância/intervalos de um item de corrida conforme a proximidade da prova. */
function taperRunningItem(item: RunningItem, daysBefore: number): RunningItem {
  // Véspera: treino soltinho, sem intervalado/tempo forte.
  if (daysBefore <= 1) {
    return {
      ...item,
      runningType: "recovery",
      distanceMeters: item.distanceMeters ? Math.round(item.distanceMeters * 0.3) : undefined,
      durationSeconds: item.durationSeconds ? Math.round(item.durationSeconds * 0.3) : undefined,
      targetPaceSecPerKm: undefined,
      interval: undefined,
    };
  }
  // 2-3 dias antes: reduz bem a carga e suaviza o tipo de treino.
  if (daysBefore <= 3) {
    return {
      ...item,
      runningType: item.runningType === "long" || item.runningType === "tempo" ? "easy" : item.runningType,
      distanceMeters: item.distanceMeters ? Math.round(item.distanceMeters * 0.5) : undefined,
      durationSeconds: item.durationSeconds ? Math.round(item.durationSeconds * 0.5) : undefined,
      interval: item.interval
        ? { ...item.interval, reps: Math.max(2, Math.round(item.interval.reps * 0.5)) }
        : undefined,
    };
  }
  // 4-10 dias antes: taper gradual (fator de 0.6 a 0.9 conforme se aproxima).
  const factor = 0.6 + 0.3 * ((daysBefore - 4) / (TAPER_WINDOW_DAYS - 4));
  return {
    ...item,
    distanceMeters: item.distanceMeters ? Math.round(item.distanceMeters * factor) : undefined,
    durationSeconds: item.durationSeconds ? Math.round(item.durationSeconds * factor) : undefined,
    interval: item.interval
      ? { ...item.interval, reps: Math.max(3, Math.round(item.interval.reps * factor)) }
      : undefined,
  };
}

function taperBlocks(blocks: Block[], daysBefore: number): Block[] {
  return blocks.map((block) => ({
    ...block,
    items: block.items.map((item) => (isRunningItem(item) ? taperRunningItem(item, daysBefore) : item)),
  }));
}

export interface RecalculationResult {
  adjustedDays: number;
}

/**
 * Recálculo automático: quando o aluno cadastra (ou muda a data de) uma
 * prova, reduz gradualmente a carga dos treinos de corrida já agendados nos
 * dias que antecedem a prova (taper) — só nos dias ainda pendentes, sem
 * mexer no que já foi concluído.
 */
export class PlanRecalculationService {
  constructor(private readonly db: PrismaClient) {}

  async recalculateForRace(studentId: string, raceDate: Date): Promise<RecalculationResult> {
    const taperStart = new Date(raceDate);
    taperStart.setDate(taperStart.getDate() - TAPER_WINDOW_DAYS);

    const assignments = await this.db.planAssignment.findMany({
      where: { studentId },
      select: { planId: true },
    });
    const planIds = assignments.map((a) => a.planId);
    if (planIds.length === 0) return { adjustedDays: 0 };

    const days = await this.db.workoutDay.findMany({
      where: {
        planId: { in: planIds },
        date: { gte: taperStart, lt: raceDate },
        status: "pending",
      },
    });

    let adjustedDays = 0;
    for (const day of days) {
      const daysBefore = Math.round(
        (raceDate.getTime() - day.date.getTime()) / (24 * 60 * 60 * 1000),
      );
      const blocks = taperBlocks(day.blocks as unknown as Block[], daysBefore);
      await this.db.workoutDay.update({
        where: { id: day.id },
        data: {
          blocks: blocks as object,
          mandatoryRecovery: daysBefore <= 1,
        },
      });
      adjustedDays++;
    }

    return { adjustedDays };
  }
}
