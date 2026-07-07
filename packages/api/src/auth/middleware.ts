import type { FastifyRequest } from "fastify";
import type { UserRole } from "@runup/types";
import { errors } from "../errors.js";
import { verifyAccessToken } from "./tokens.js";

export interface AuthUser {
  id: string;
  role: UserRole;
}

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}

/**
 * preHandler que exige um access token válido no header Authorization.
 * Anexa o usuário autenticado a `request.authUser`.
 */
export async function requireAuth(request: FastifyRequest): Promise<void> {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw errors.unauthorized();
  }
  const token = header.slice("Bearer ".length);
  try {
    const claims = verifyAccessToken(token);
    request.authUser = { id: claims.sub, role: claims.role };
  } catch {
    throw errors.unauthorized();
  }
}
