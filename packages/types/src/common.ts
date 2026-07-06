/** Identificador único (UUID) — tipado por entidade via branding leve. */
export type Id<TBrand extends string> = string & { readonly __brand: TBrand };

/** Instante em ISO 8601 (ex.: "2026-07-04T09:12:00Z"). */
export type IsoDateTime = string;

/** Data sem hora em ISO 8601 (ex.: "2026-07-04"). */
export type IsoDate = string;

/** Distâncias de prova reconhecidas para RPs e metas. */
export type RaceDistance = "5k" | "10k" | "21k" | "42k" | "other";

/** Papel único de uma conta. */
export type UserRole = "student" | "coach";
