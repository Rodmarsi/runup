import { z } from "zod";

export const createShoeSchema = z.object({
  name: z.string().min(1).max(80),
  brand: z.string().max(60).optional(),
  model: z.string().max(60).optional(),
  alertKm: z.number().int().positive().max(3000).optional(),
});

export const updateShoeSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  brand: z.string().max(60).optional(),
  model: z.string().max(60).optional(),
  totalKm: z.number().min(0).optional(),
  alertKm: z.number().int().positive().max(3000).optional(),
  retired: z.boolean().optional(),
});

export type CreateShoeInput = z.infer<typeof createShoeSchema>;
export type UpdateShoeInput = z.infer<typeof updateShoeSchema>;
