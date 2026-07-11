import type { Id, IsoDate, IsoDateTime } from "./common.js";
import type { UserId } from "./user.js";

export type AchievementId = Id<"Achievement">;
export type MissionId = Id<"Mission">;

export type MissionPeriod = "daily" | "weekly";

/** Progresso de gamificação (XP/nível) — 1 registro por aluno. */
export interface AthleteProgress {
  studentId: UserId;
  xp: number;
  level: number;
}

/** Conquista desbloqueada (ex.: "first_5k", "100km_total"). */
export interface Achievement {
  id: AchievementId;
  studentId: UserId;
  code: string;
  achievedAt: IsoDateTime;
}

/** Missão diária/semanal (ex.: "correr 3x esta semana"). */
export interface Mission {
  id: MissionId;
  studentId: UserId;
  code: string;
  period: MissionPeriod;
  targetDate: IsoDate;
  progress: number;
  target: number;
  completedAt?: IsoDateTime;
}
