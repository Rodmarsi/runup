import { describe, it, expect } from "vitest";
import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
  signStravaState,
  verifyStravaState,
} from "./tokens.js";

describe("access token", () => {
  it("assina e verifica preservando claims", () => {
    const token = signAccessToken({ sub: "user-1", role: "coach" });
    const claims = verifyAccessToken(token);
    expect(claims).toEqual({ sub: "user-1", role: "coach" });
  });

  it("rejeita token adulterado", () => {
    const token = signAccessToken({ sub: "user-1", role: "student" });
    expect(() => verifyAccessToken(token + "x")).toThrow();
  });
});

describe("refresh token", () => {
  it("gera valor bruto diferente do hash", () => {
    const { raw, hash } = generateRefreshToken();
    expect(raw).not.toEqual(hash);
    expect(hashRefreshToken(raw)).toEqual(hash);
  });

  it("dois tokens são distintos", () => {
    expect(generateRefreshToken().raw).not.toEqual(
      generateRefreshToken().raw,
    );
  });

  it("expiração é 30 dias à frente", () => {
    const now = new Date("2026-07-06T00:00:00Z");
    const exp = refreshTokenExpiry(now);
    expect(exp.toISOString()).toBe("2026-08-05T00:00:00.000Z");
  });
});

describe("strava state (OAuth)", () => {
  it("assina e verifica preservando o studentId", () => {
    const state = signStravaState("student-1");
    expect(verifyStravaState(state)).toBe("student-1");
  });

  it("rejeita um access token comum como state", () => {
    const notAState = signAccessToken({ sub: "student-1", role: "student" });
    expect(() => verifyStravaState(notAState)).toThrow();
  });
});
