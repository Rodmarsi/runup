import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(["student", "coach"]),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const updateMeSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  // Data URI (ex.: "data:image/jpeg;base64,...") — sem storage externo, guarda
  // direto no banco; por isso o limite de tamanho (evita payloads absurdos).
  avatarUrl: z.string().max(700_000).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
