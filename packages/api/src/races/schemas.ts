import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve ser YYYY-MM-DD");

export const createRaceSchema = z.object({
  name: z.string().min(1).max(120),
  city: z.string().max(80).optional(),
  state: z.string().max(2).optional(),
  raceDate: isoDate,
  startTime: z.string().max(20).optional(),
  distanceMeters: z.number().int().positive().optional(),
  targetTimeSeconds: z.number().int().positive().optional(),
  courseUrl: z.string().url().max(500).optional(),
  registrationUrl: z.string().url().max(500).optional(),
});

export const updateRaceSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(2).optional(),
  raceDate: isoDate.optional(),
  startTime: z.string().max(20).optional(),
  distanceMeters: z.number().int().positive().optional(),
  targetTimeSeconds: z.number().int().positive().optional(),
  courseUrl: z.string().url().max(500).optional(),
  registrationUrl: z.string().url().max(500).optional(),
  status: z.enum(["interested", "registered", "completed"]).optional(),
});

export type CreateRaceInput = z.infer<typeof createRaceSchema>;
export type UpdateRaceInput = z.infer<typeof updateRaceSchema>;
