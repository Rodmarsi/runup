import type { PrismaClient } from "@runup/db";
import { NotificationService } from "../notifications/service.js";

export interface ReminderRunResult {
  workoutReminders: number;
  raceReminders: number;
}

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function endOfDay(d: Date): Date {
  return new Date(startOfDay(d).getTime() + 24 * 60 * 60 * 1000 - 1);
}

/**
 * Lembretes de treino/prova — pensado pra ser chamado uma vez por dia por um
 * agendador externo (a API não roda jobs em segundo plano), ver
 * POST /internal/reminders/run e o workflow do GitHub Actions.
 */
export class ReminderService {
  private readonly notifications: NotificationService;

  constructor(private readonly db: PrismaClient) {
    this.notifications = new NotificationService(db);
  }

  async run(now: Date = new Date()): Promise<ReminderRunResult> {
    const workoutReminders = await this.remindTodayWorkouts(now);
    const raceReminders = await this.remindUpcomingRaces(now);
    return { workoutReminders, raceReminders };
  }

  /** Avisa quem tem treino agendado hoje e ainda não registrou nada pra esse dia. */
  private async remindTodayWorkouts(now: Date): Promise<number> {
    const days = await this.db.workoutDay.findMany({
      where: {
        date: { gte: startOfDay(now), lte: endOfDay(now) },
        status: "pending",
      },
      include: { plan: { include: { assignments: true } }, logs: true },
    });

    let count = 0;
    for (const day of days) {
      if (day.logs.length > 0) continue;
      for (const assignment of day.plan.assignments) {
        await this.notifications.send(
          assignment.studentId,
          "Treino de hoje",
          "Você tem um treino agendado pra hoje. Bora!",
        );
        count++;
      }
    }
    return count;
  }

  /** Avisa 3 dias antes e na véspera de uma prova cadastrada. */
  private async remindUpcomingRaces(now: Date): Promise<number> {
    let count = 0;
    for (const daysAhead of [3, 1]) {
      const target = new Date(now);
      target.setUTCDate(target.getUTCDate() + daysAhead);

      const races = await this.db.race.findMany({
        where: {
          raceDate: { gte: startOfDay(target), lte: endOfDay(target) },
          status: { in: ["interested", "registered"] },
        },
      });

      for (const race of races) {
        const label = daysAhead === 1 ? "amanhã" : `em ${daysAhead} dias`;
        await this.notifications.send(
          race.studentId,
          "Prova chegando!",
          `${race.name} é ${label}. Boa sorte!`,
        );
        count++;
      }
    }
    return count;
  }
}
