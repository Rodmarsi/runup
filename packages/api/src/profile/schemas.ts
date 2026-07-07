import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve ser YYYY-MM-DD");

export const bodyMetricSchema = z.object({
  date: isoDate,
  weightKg: z.number().positive().max(400).optional(),
  bodyFatPct: z.number().min(0).max(70).optional(),
});

export const personalRecordSchema = z.object({
  distance: z.enum(["5k", "10k", "21k", "42k", "other"]),
  timeSeconds: z.number().int().positive(),
  achievedAt: isoDate,
});

export type BodyMetricInput = z.infer<typeof bodyMetricSchema>;
export type PersonalRecordInput = z.infer<typeof personalRecordSchema>;
