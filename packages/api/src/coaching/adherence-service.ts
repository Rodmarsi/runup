import type { PrismaClient } from "@runup/db";

export interface AdherenceAlert {
  studentId: string;
  studentName: string;
  consecutiveMissed: number;
}

const DEFAULT_THRESHOLD = 3;

export class AdherenceService {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Alunos ativos do treinador com N treinos pulados em sequência.
   * Um dia é "perdido" se foi marcado como skipped ou se ficou pending com
   * a data já no passado. Conta a sequência a partir do dia passado mais recente.
   */
  async coachAlerts(
    coachId: string,
    now: Date = new Date(),
    threshold = DEFAULT_THRESHOLD,
  ): Promise<AdherenceAlert[]> {
    const links = await this.db.coachStudent.findMany({
      where: { coachId, status: "active" },
      include: { student: { select: { id: true, name: true } } },
    });

    const alerts: AdherenceAlert[] = [];
    for (const link of links) {
      const missed = await this.consecutiveMissed(link.studentId, now);
      if (missed >= threshold) {
        alerts.push({
          studentId: link.studentId,
          studentName: link.student.name,
          consecutiveMissed: missed,
        });
      }
    }
    return alerts;
  }

  /** Conta treinos perdidos em sequência entre os dias já passados do aluno. */
  async consecutiveMissed(studentId: string, now: Date): Promise<number> {
    const assignments = await this.db.planAssignment.findMany({
      where: { studentId },
      select: { planId: true },
    });
    const planIds = assignments.map((a) => a.planId);
    if (planIds.length === 0) return 0;

    const pastDays = await this.db.workoutDay.findMany({
      where: { planId: { in: planIds }, date: { lt: now } },
      orderBy: { date: "desc" },
      select: { status: true },
    });

    let streak = 0;
    for (const day of pastDays) {
      const missed = day.status === "skipped" || day.status === "pending";
      if (missed) streak += 1;
      else break;
    }
    return streak;
  }
}
