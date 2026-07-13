import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve ser YYYY-MM-DD");

export const bodyMetricSchema = z.object({
  date: isoDate,
  weightKg: z.number().positive().max(400).optional(),
  bodyFatPct: z.number().min(0).max(70).optional(),
});

/** Categorias padrão de recorde pessoal — o aluno também pode criar a sua própria. */
export const STANDARD_RECORD_CATEGORIES = ["5k", "10k", "15k", "21k", "42k"] as const;

export const personalRecordSchema = z.object({
  distance: z.string().trim().min(1).max(30),
  timeSeconds: z.number().int().positive(),
  achievedAt: isoDate,
});

export const athleteProfileSchema = z.object({
  heightCm: z.number().positive().max(260).optional(),
  birthDate: isoDate.optional(),
  sex: z.enum(["male", "female", "other"]).optional(),
  hrMaxBpm: z.number().int().positive().max(250).optional(),
  vo2max: z.number().positive().max(100).optional(),
  experience: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  weeklyAvailabilityDays: z.number().int().min(0).max(7).optional(),
});

export type BodyMetricInput = z.infer<typeof bodyMetricSchema>;
export type PersonalRecordInput = z.infer<typeof personalRecordSchema>;
export type AthleteProfileInput = z.infer<typeof athleteProfileSchema>;
