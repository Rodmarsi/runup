import type { Id, IsoDateTime, UserRole } from "./common.js";

export type UserId = Id<"User">;

export interface User {
  id: UserId;
  role: UserRole;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: IsoDateTime;
}

/** Métodos de autenticação suportados. */
export type AuthProvider = "email" | "google" | "strava";
