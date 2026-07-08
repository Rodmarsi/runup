import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import type { UserRole } from "@runup/types";
import { config } from "../config.js";

export interface AccessTokenClaims {
  sub: string;
  role: UserRole;
}

/** Assina um access token JWT de curta duração. */
export function signAccessToken(claims: AccessTokenClaims): string {
  return jwt.sign(claims, config.jwtSecret, {
    expiresIn: config.accessTokenTtl,
  });
}

/** Verifica e decodifica um access token. Lança se inválido/expirado. */
export function verifyAccessToken(token: string): AccessTokenClaims {
  const decoded = jwt.verify(token, config.jwtSecret);
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof decoded.sub !== "string" ||
    (decoded.role !== "student" && decoded.role !== "coach")
  ) {
    throw new Error("Token inválido");
  }
  return { sub: decoded.sub, role: decoded.role };
}

/** Gera um refresh token opaco (valor bruto) e seu hash para persistência. */
export function generateRefreshToken(): { raw: string; hash: string } {
  const raw = randomBytes(48).toString("base64url");
  return { raw, hash: hashRefreshToken(raw) };
}

/** Hash determinístico do refresh token — só o hash é guardado no banco. */
export function hashRefreshToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Data de expiração do refresh token a partir de agora. */
export function refreshTokenExpiry(now: Date = new Date()): Date {
  const expires = new Date(now);
  expires.setDate(expires.getDate() + config.refreshTokenTtlDays);
  return expires;
}

/** Assina o `state` do OAuth do Strava (carrega o aluno, curta duração). */
export function signStravaState(studentId: string): string {
  return jwt.sign({ sub: studentId, purpose: "strava" }, config.jwtSecret, {
    expiresIn: "10m",
  });
}

/** Verifica o `state` do callback do Strava e retorna o studentId. */
export function verifyStravaState(token: string): string {
  const decoded = jwt.verify(token, config.jwtSecret);
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    decoded.purpose !== "strava" ||
    typeof decoded.sub !== "string"
  ) {
    throw new Error("State inválido");
  }
  return decoded.sub;
}
