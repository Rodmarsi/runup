import type { PrismaClient } from "@runup/db";

/** Exporta tudo que o aluno tem cadastrado — usado em Configurações > Exportar dados. */
export class DataExportService {
  constructor(private readonly db: PrismaClient) {}

  async exportForStudent(studentId: string) {
    const [
      user,
      athleteProfile,
      bodyMetrics,
      workoutLogs,
      races,
      shoes,
      personalRecords,
      goals,
      progress,
      achievements,
    ] = await Promise.all([
      this.db.user.findUnique({
        where: { id: studentId },
        select: { id: true, name: true, email: true, createdAt: true },
      }),
      this.db.athleteProfile.findUnique({ where: { studentId } }),
      this.db.bodyMetric.findMany({ where: { studentId }, orderBy: { date: "asc" } }),
      this.db.workoutLog.findMany({ where: { studentId }, orderBy: { completedAt: "asc" } }),
      this.db.race.findMany({ where: { studentId }, orderBy: { raceDate: "asc" } }),
      this.db.shoe.findMany({ where: { studentId } }),
      this.db.personalRecord.findMany({ where: { studentId }, orderBy: { achievedAt: "asc" } }),
      this.db.goal.findMany({ where: { studentId } }),
      this.db.athleteProgress.findUnique({ where: { studentId } }),
      this.db.achievement.findMany({ where: { studentId } }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      user,
      athleteProfile,
      bodyMetrics,
      workoutLogs,
      races,
      shoes,
      personalRecords,
      goals,
      gamification: { progress, achievements },
    };
  }
}
