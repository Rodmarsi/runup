import { z } from "zod";

/** Item de corrida — inclui estrutura opcional de intervalos. */
const runningItemSchema = z.object({
  kind: z.literal("running"),
  runningType: z.enum(["easy", "intervals", "long", "tempo", "recovery"]),
  distanceMeters: z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  targetPaceSecPerKm: z.number().int().positive().optional(),
  interval: z
    .object({
      reps: z.number().int().positive(),
      repDistanceMeters: z.number().int().positive().optional(),
      repDurationSeconds: z.number().int().positive().optional(),
      recoverySeconds: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

const strengthMobilityItemSchema = z.object({
  kind: z.enum(["strength", "mobility"]),
  exerciseId: z.string(),
  sets: z.number().int().positive().optional(),
  reps: z.number().int().positive().optional(),
  loadKg: z.number().positive().optional(),
});

const freeItemSchema = z.object({
  kind: z.literal("free"),
  notes: z.string().min(1),
});

const blockItemSchema = z.discriminatedUnion("kind", [
  runningItemSchema,
  strengthMobilityItemSchema,
  freeItemSchema,
]);

export const blockSchema = z.object({
  kind: z.enum(["running", "strength", "mobility", "free"]),
  role: z.enum(["warmup", "main", "cooldown"]),
  order: z.number().int().nonnegative(),
  items: z.array(blockItemSchema),
});

export const blocksSchema = z.array(blockSchema);

export type BlocksInput = z.infer<typeof blocksSchema>;
