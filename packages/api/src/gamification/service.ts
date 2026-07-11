import type { PrismaClient } from "@runup/db";

const XP_PER_LEVEL = 100;

function startOfWeek(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = (d.getUTCDay() + 6) % 7; // segunda = 0
  d.setUTCDate(d.getUTCDate() - day);
  return d;
}

function startOfDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export interface MissionSnapshot {
  code: string;
  period: "daily" | "weekly";
  progress: number;
  target: number;
  completedAt: string | null;
}

export interface GamificationSnapshot {
  xp: number;
  level: number;
  achievements: string[];
  missions: MissionSnapshot[];
}

/**
 * XP, níveis, conquistas e missões — tudo derivado dos `WorkoutLog` já
 * existentes, sem precisar de um job em segundo plano.
 */
export class GamificationService {
  constructor(private readonly db: PrismaClient) {}

  /** Chamado depois de qualquer treino registrado (check-in, avulso ou Strava). */
  async onWorkoutLogged(studentId: string, distanceMeters: number | null) {
    const xpGain = 10 + Math.round((distanceMeters ?? 0) / 1000);
    let progress = await this.db.athleteProgress.upsert({
      where: { studentId },
      create: { studentId, xp: xpGain, level: 1 },
      update: { xp: { increment: xpGain } },
    });
    const level = Math.floor(progress.xp / XP_PER_LEVEL) + 1;
    if (level !== progress.level) {
      progress = await this.db.athleteProgress.update({
        where: { studentId },
        data: { level },
      });
    }

    await this.checkAchievements(studentId, distanceMeters);
    await this.bumpMissions(studentId);
    return progress;
  }

  private async checkAchievements(studentId: string, distanceMeters: number | null) {
    const codes: string[] = [];
    if (distanceMeters) {
      if (distanceMeters >= 5000) codes.push("first_5k");
      if (distanceMeters >= 10000) codes.push("first_10k");
      if (distanceMeters >= 21097) codes.push("first_half");
      if (distanceMeters >= 42195) codes.push("first_marathon");
    }

    const total = await this.db.workoutLog.aggregate({
      where: { studentId },
      _sum: { distanceMeters: true },
    });
    const totalDistance = total._sum.distanceMeters ?? 0;
    if (totalDistance >= 100_000) codes.push("100km_total");
    if (totalDistance >= 500_000) codes.push("500km_total");

    for (const code of codes) {
      await this.db.achievement.upsert({
        where: { studentId_code: { studentId, code } },
        create: { studentId, code },
        update: {},
      });
    }
  }

  /** Cria/atualiza a missão semanal e a diária — idempotente, uma linha por período. */
  private async bumpMissions(studentId: string, now: Date = new Date()) {
    const week = startOfWeek(now);
    const day = startOfDay(now);

    const weeklyCount = await this.db.workoutLog.count({
      where: { studentId, completedAt: { gte: week } },
    });
    await this.db.mission.upsert({
      where: { studentId_code_targetDate: { studentId, code: "run_3x_week", targetDate: week } },
      create: {
        studentId,
        code: "run_3x_week",
        period: "weekly",
        targetDate: week,
        target: 3,
        progress: Math.min(weeklyCount, 3),
        completedAt: weeklyCount >= 3 ? now : null,
      },
      update: {
        progress: Math.min(weeklyCount, 3),
        completedAt: weeklyCount >= 3 ? now : null,
      },
    });

    const dailyCount = await this.db.workoutLog.count({
      where: { studentId, completedAt: { gte: day } },
    });
    await this.db.mission.upsert({
      where: { studentId_code_targetDate: { studentId, code: "log_today", targetDate: day } },
      create: {
        studentId,
        code: "log_today",
        period: "daily",
        targetDate: day,
        target: 1,
        progress: Math.min(dailyCount, 1),
        completedAt: dailyCount >= 1 ? now : null,
      },
      update: {
        progress: Math.min(dailyCount, 1),
        completedAt: dailyCount >= 1 ? now : null,
      },
    });
  }

  async snapshot(studentId: string): Promise<GamificationSnapshot> {
    const now = new Date();
    // Garante que a missão do período atual exista mesmo sem log novo hoje.
    await this.bumpMissions(studentId, now);

    const [progress, achievements, missions] = await Promise.all([
      this.db.athleteProgress.findUnique({ where: { studentId } }),
      this.db.achievement.findMany({ where: { studentId } }),
      this.db.mission.findMany({
        where: { studentId, targetDate: { gte: startOfWeek(now) } },
        orderBy: { targetDate: "desc" },
      }),
    ]);

    return {
      xp: progress?.xp ?? 0,
      level: progress?.level ?? 1,
      achievements: achievements.map((a) => a.code),
      missions: missions.map((m) => ({
        code: m.code,
        period: m.period,
        progress: m.progress,
        target: m.target,
        completedAt: m.completedAt?.toISOString() ?? null,
      })),
    };
  }
}
