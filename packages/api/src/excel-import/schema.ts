import { z } from "zod";
import { blocksSchema } from "../plans/block-schema.js";

/** Dia interpretado pela IA, com rastreabilidade e confiança. */
export const interpretedDaySchema = z.object({
  week: z.number().int().positive(),
  /** Data ISO se a IA conseguiu inferir; senão o treinador resolve na revisão. */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dayLabel: z.string().optional(),
  blocks: blocksSchema,
  /** Célula/aba de origem, para o treinador conferir contra a planilha. */
  sourceRef: z.string().optional(),
  confidence: z.enum(["high", "low"]),
  /** Explicação da dúvida quando confidence = low. */
  note: z.string().optional(),
});

/** Plano interpretado a partir da planilha. */
export const interpretedPlanSchema = z.object({
  title: z.string().min(1),
  durationWeeks: z.number().int().positive().max(52),
  days: z.array(interpretedDaySchema).min(1),
});

export type InterpretedDay = z.infer<typeof interpretedDaySchema>;
export type InterpretedPlan = z.infer<typeof interpretedPlanSchema>;
