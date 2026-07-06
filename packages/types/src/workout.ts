import type { Id, IsoDate, IsoDateTime } from "./common.js";
import type { UserId } from "./user.js";

export type PlanId = Id<"Plan">;
export type PlanAssignmentId = Id<"PlanAssignment">;
export type WorkoutDayId = Id<"WorkoutDay">;
export type ExerciseId = Id<"Exercise">;
export type WorkoutTemplateId = Id<"WorkoutTemplate">;

/** Origem do plano: pronto do RunUp ou montado por um treinador. */
export type PlanType = "generic" | "custom";

export interface Plan {
  id: PlanId;
  ownerId: UserId;
  type: PlanType;
  title: string;
  /** Duração do ciclo em semanas (ex.: 8, 12, 16). */
  durationWeeks: number;
  createdAt: IsoDateTime;
}

export interface PlanAssignment {
  id: PlanAssignmentId;
  planId: PlanId;
  studentId: UserId;
  startDate: IsoDate;
}

export type WorkoutDayStatus = "pending" | "done" | "partial" | "skipped";

export interface WorkoutDay {
  id: WorkoutDayId;
  planId: PlanId;
  /** Semana (1-based) e dia dentro da semana, para o calendário. */
  week: number;
  date: IsoDate;
  status: WorkoutDayStatus;
  blocks: Block[];
}

/** Natureza do bloco. */
export type BlockKind = "running" | "strength" | "mobility" | "free";

/** Papel do bloco na estrutura do treino. */
export type BlockRole = "warmup" | "main" | "cooldown";

/** Tipo da sessão de corrida. */
export type RunningType = "easy" | "intervals" | "long" | "tempo" | "recovery";

export interface Block {
  kind: BlockKind;
  role: BlockRole;
  order: number;
  items: BlockItem[];
}

/** Bloco de corrida — inclui estrutura opcional de intervalos. */
export interface RunningItem {
  kind: "running";
  runningType: RunningType;
  distanceMeters?: number;
  durationSeconds?: number;
  targetPaceSecPerKm?: number;
  /** Estrutura de intervalado (ex.: 10× 400m com 90s de recuperação). */
  interval?: {
    reps: number;
    repDistanceMeters?: number;
    repDurationSeconds?: number;
    recoverySeconds?: number;
  };
}

export interface StrengthMobilityItem {
  kind: "strength" | "mobility";
  exerciseId: ExerciseId;
  sets?: number;
  reps?: number;
  loadKg?: number;
}

export interface FreeItem {
  kind: "free";
  notes: string;
}

export type BlockItem = RunningItem | StrengthMobilityItem | FreeItem;

export interface Exercise {
  id: ExerciseId;
  name: string;
  muscleGroup?: string;
  mediaUrl?: string;
}

/** Categoria de um treino reusável. */
export type WorkoutCategory =
  | "intervals"
  | "long"
  | "recovery"
  | "tempo"
  | "strength"
  | "mobility"
  | "other";

/** Treino reusável (biblioteca do treinador ou do sistema). */
export interface WorkoutTemplate {
  id: WorkoutTemplateId;
  ownerId: UserId;
  title: string;
  category: WorkoutCategory;
  blocks: Block[];
}
