import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve ser YYYY-MM-DD");

/** Respostas do "Criar com IA" — o aluno descreve objetivo, rotina e histórico. */
export const generatePlanSchema = z.object({
  objective: z.string().min(1).max(200),
  targetRace: z.enum(["5k", "10k", "21k", "42k", "other"]).optional(),
  raceDate: isoDate.optional(),
  /** Dias da semana disponíveis pra treinar (0=domingo … 6=sábado). */
  availableWeekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  /** Dia fixo do treino longo (0=domingo … 6=sábado) — precisa estar em availableWeekdays. */
  longRunWeekday: z.number().int().min(0).max(6).optional(),
  durationWeeks: z.number().int().positive().max(24),
  startDate: isoDate,
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  bestPaceSecPerKm: z.number().int().positive().optional(),
  longestDistanceMeters: z.number().int().positive().optional(),
  injuries: z.string().max(500).optional(),
});

export type GeneratePlanInput = z.infer<typeof generatePlanSchema>;
