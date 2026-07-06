import type { Id, IsoDate, RaceDistance } from "./common.js";
import type { UserId } from "./user.js";
import type { PlanId } from "./workout.js";

export type GoalId = Id<"Goal">;

export type GoalStatus = "active" | "achieved" | "abandoned";

/** Prova alvo / meta, definida em conjunto por aluno e treinador. */
export interface Goal {
  id: GoalId;
  studentId: UserId;
  planId?: PlanId;
  targetRace: RaceDistance;
  raceName?: string;
  raceDate: IsoDate;
  /** Tempo alvo em segundos. */
  targetTimeSeconds?: number;
  status: GoalStatus;
}
