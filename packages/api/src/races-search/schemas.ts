import { z } from "zod";

export const BRAZILIAN_STATES = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MT",
  "MS", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SE", "SP", "TO",
] as const;

const uf = z.enum(BRAZILIAN_STATES);

export const searchRacesQuerySchema = z.object({
  state: uf,
  city: z.string().max(80).optional(),
  minDistanceMeters: z.coerce.number().int().positive().optional(),
});

export const importRaceSchema = z.object({
  state: uf,
  externalId: z.string().min(1).max(20),
});

export type SearchRacesQuery = z.infer<typeof searchRacesQuerySchema>;
export type ImportRaceInput = z.infer<typeof importRaceSchema>;
