import type { Id, IsoDate, IsoDateTime, RaceDistance } from "./common.js";
import type { UserId } from "./user.js";
import type { WorkoutDayId } from "./workout.js";
import type { ShoeId } from "./equipment.js";

export type WorkoutLogId = Id<"WorkoutLog">;
export type BodyMetricId = Id<"BodyMetric">;
export type PersonalRecordId = Id<"PersonalRecord">;

/** Fonte da confirmação de execução. */
export type WorkoutLogSource = "manual" | "strava";

/** Tipo de atividade — permite filtrar o histórico e distinguir dois treinos no mesmo dia. */
export type WorkoutLogKind = "running" | "strength" | "mobility" | "bike" | "walk" | "other";

/** Split de um km (pace por km). */
export interface Split {
  km: number;
  paceSecPerKm: number;
}

/** Confirmação de execução de um WorkoutDay (não é corrida gravada no app). */
export interface WorkoutLog {
  id: WorkoutLogId;
  workoutDayId?: WorkoutDayId;
  studentId: UserId;
  source: WorkoutLogSource;
  kind: WorkoutLogKind;
  completedAt: IsoDateTime;
  distanceMeters?: number;
  durationSeconds?: number;
  avgPaceSecPerKm?: number;
  avgHeartRate?: number;
  cadence?: number;
  elevationGainMeters?: number;
  splits?: Split[];
  caloriesKcal?: number;
  weather?: string;
  shoeId?: ShoeId;
  /** Feedback do aluno. */
  perceivedEffort?: number;
  pain?: string;
  notes?: string;
}

export interface BodyMetric {
  id: BodyMetricId;
  studentId: UserId;
  date: IsoDate;
  weightKg?: number;
  bodyFatPct?: number;
}

export interface PersonalRecord {
  id: PersonalRecordId;
  studentId: UserId;
  distance: RaceDistance;
  timeSeconds: number;
  achievedAt: IsoDate;
}
