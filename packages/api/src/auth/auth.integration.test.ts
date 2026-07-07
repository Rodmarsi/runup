import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@runup/db";
import { buildApp } from "../app.js";
import { resetDb } from "../testing/reset-db.js";

const app = buildApp({ logger: false });

beforeEach(resetDb);
afterAll(async () => {
  await resetDb();
  await app.close();
  await prisma.$disconnect();
});

const validUser = {
  name: "Matheus Braga",
  email: "matheus@runup.app",
  password: "segredo123",
  role: "student" as const,
};

function register(body: Record<string, unknown> = validUser) {
  return app.inject({ method: "POST", url: "/auth/register", payload: body });
}

describe("POST /auth/register", () => {
  it("cria a conta e retorna tokens + usuário", async () => {
    const res = await register();
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    expect(body.user).toMatchObject({
      email: validUser.email,
      role: "student",
    });
    expect(body.user.passwordHash).toBeUndefined();
  });

  it("rejeita email duplicado com 409", async () => {
    await register();
    const res = await register();
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe("EMAIL_IN_USE");
  });

  it("rejeita payload inválido com 422", async () => {
    const res = await register({ ...validUser, email: "não-é-email" });
    expect(res.statusCode).toBe(422);
    expect(res.json().code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /auth/login", () => {
  it("autentica com credenciais corretas", async () => {
    await register();
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: validUser.email, password: validUser.password },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().accessToken).toBeTruthy();
  });

  it("rejeita senha errada com 401", async () => {
    await register();
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: validUser.email, password: "errada" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe("INVALID_CREDENTIALS");
  });
});

describe("POST /auth/refresh (rotação)", () => {
  it("emite novo par e invalida o refresh usado", async () => {
    const { refreshToken } = (await register()).json();

    const first = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken },
    });
    expect(first.statusCode).toBe(200);
    expect(first.json().refreshToken).not.toBe(refreshToken);

    // Reusar o token antigo deve falhar (foi rotacionado).
    const reuse = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken },
    });
    expect(reuse.statusCode).toBe(401);
  });
});

describe("GET /auth/me", () => {
  it("retorna o usuário com token válido", async () => {
    const { accessToken } = (await register()).json();
    const res = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().email).toBe(validUser.email);
  });

  it("nega acesso sem token com 401", async () => {
    const res = await app.inject({ method: "GET", url: "/auth/me" });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe("UNAUTHORIZED");
  });

  it("nega acesso com token inválido", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: "Bearer lixo" },
    });
    expect(res.statusCode).toBe(401);
  });
});
