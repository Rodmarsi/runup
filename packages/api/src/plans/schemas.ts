import { z } from "zod";
import { blocksSchema } from "./block-schema.js";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve ser YYYY-MM-DD");

export const createPlanSchema = z.object({
  studentId: z.string(),
  title: z.string().min(2).max(120),
  durationWeeks: z.number().int().positive().max(52),
  startDate: isoDate,
  days: z
    .array(
      z.object({
        week: z.number().int().positive(),
        date: isoDate,
        blocks: blocksSchema,
      }),
    )
    .min(1),
});

const splitSchema = z.object({
  km: z.number().int().positive(),
  paceSecPerKm: z.number().int().positive(),
});

export const logWorkoutSchema = z.object({
  status: z.enum(["done", "partial", "skipped"]),
  source: z.enum(["manual", "strava"]).default("manual"),
  distanceMeters: z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  avgPaceSecPerKm: z.number().int().positive().optional(),
  avgHeartRate: z.number().int().positive().optional(),
  cadence: z.number().int().positive().optional(),
  elevationGainM: z.number().int().nonnegative().optional(),
  splits: z.array(splitSchema).optional(),
  perceivedEffort: z.number().int().min(1).max(10).optional(),
  pain: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

const workoutLogKind = z.enum(["running", "strength", "mobility", "bike", "walk", "other"]);

/** Treino avulso, registrado pelo aluno sem estar ligado a um dia de um plano. */
export const logStandaloneWorkoutSchema = z.object({
  kind: workoutLogKind.default("running"),
  distanceMeters: z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  perceivedEffort: z.number().int().min(1).max(10).optional(),
  pain: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

export const listWorkoutLogsQuerySchema = z.object({
  kind: workoutLogKind.optional(),
  since: isoDate.optional(),
});

export const commentSchema = z.object({
  text: z.string().min(1).max(2000),
});

export const createGoalSchema = z.object({
  studentId: z.string(),
  planId: z.string().optional(),
  targetRace: z.enum(["5k", "10k", "21k", "42k", "other"]),
  raceName: z.string().max(120).optional(),
  raceDate: isoDate,
  targetTimeSeconds: z.number().int().positive().optional(),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type LogWorkoutInput = z.infer<typeof logWorkoutSchema>;
export type LogStandaloneWorkoutInput = z.infer<typeof logStandaloneWorkoutSchema>;
export type ListWorkoutLogsQuery = z.infer<typeof listWorkoutLogsQuerySchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
