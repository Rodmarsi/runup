import type { Id, IsoDateTime } from "./common.js";
import type { UserId } from "./user.js";

export type CoachStudentId = Id<"CoachStudent">;

export type CoachStudentStatus = "pending" | "active" | "ended";

/** Vínculo entre um treinador e um aluno. Sustenta o marketplace. */
export interface CoachStudent {
  id: CoachStudentId;
  coachId: UserId;
  studentId: UserId;
  status: CoachStudentStatus;
  createdAt: IsoDateTime;
}

export type SubscriptionId = Id<"Subscription">;

/** Faixa de cobrança do treinador, por nº de alunos ativos. */
export type SubscriptionTier = "free" | "pro" | "elite";

export type SubscriptionStatus = "active" | "past_due" | "canceled";

export interface Subscription {
  id: SubscriptionId;
  coachId: UserId;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodEnd: IsoDateTime;
}
