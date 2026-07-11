import type { IsoDate } from "./common.js";
import type { UserId } from "./user.js";

export type Sex = "male" | "female" | "other";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

/** Dados estáticos do atleta (tela Perfil > Informações) — separado de `BodyMetric`, que é a série histórica de peso. */
export interface AthleteProfile {
  studentId: UserId;
  heightCm?: number;
  birthDate?: IsoDate;
  sex?: Sex;
  hrMaxBpm?: number;
  vo2max?: number;
  experience?: ExperienceLevel;
  weeklyAvailabilityDays?: number;
}
