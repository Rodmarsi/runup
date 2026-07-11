import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@runup/db";
import { buildApp } from "../../app.js";
import { resetDb } from "../../testing/reset-db.js";
import { signGoogleState } from "../tokens.js";
import type { GoogleClient, GoogleProfile } from "./client.js";

/** Cliente Google falso — evita chamar a API real nos testes. */
class FakeGoogleClient implements GoogleClient {
  profile: GoogleProfile = { email: "novo@gmail.com", name: "Novo Usuário" };
  async exchangeCode(): Promise<GoogleProfile> {
    return this.profile;
  }
}

const fake = new FakeGoogleClient();
const app = buildApp({ logger: false, googleClient: fake });

beforeEach(resetDb);
afterAll(async () => {
  await resetDb();
  await app.close();
  await prisma.$disconnect();
});

describe("login com Google", () => {
  it("authorize retorna a URL do Google com o papel no state", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/auth/google/authorize?role=coach",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().url).toContain("accounts.google.com");
  });

  it("callback cria a conta e redireciona ao web com tokens", async () => {
    const state = signGoogleState("coach", "web");
    fake.profile = { email: "coach@gmail.com", name: "Treinador Google" };
    const res = await app.inject({
      method: "GET",
      url: `/auth/google/callback?code=abc&state=${state}`,
    });
    expect(res.statusCode).toBe(302);
    const location = res.headers.location as string;
    expect(location).toContain("/auth/callback#");
    expect(location).toContain("access_token=");

    const user = await prisma.user.findUnique({
      where: { email: "coach@gmail.com" },
    });
    expect(user).toMatchObject({ role: "coach", authProvider: "google" });
  });

  it("callback loga usuário existente (não duplica)", async () => {
    const state = signGoogleState("student", "web");
    fake.profile = { email: "existe@gmail.com", name: "Fulano" };
    await app.inject({
      method: "GET",
      url: `/auth/google/callback?code=a&state=${state}`,
    });
    await app.inject({
      method: "GET",
      url: `/auth/google/callback?code=b&state=${state}`,
    });
    const count = await prisma.user.count({
      where: { email: "existe@gmail.com" },
    });
    expect(count).toBe(1);
  });

  it("callback sem código redireciona ao login com erro", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/auth/google/callback?error=access_denied",
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("/login?error=google");
  });

  it("authorize com platform=mobile embute a plataforma no state", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/auth/google/authorize?role=student&platform=mobile",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().url).toContain("accounts.google.com");
  });

  it("callback do mobile redireciona ao deep link do app, não à web", async () => {
    const state = signGoogleState("student", "mobile");
    fake.profile = { email: "mobile@gmail.com", name: "Fulano Mobile" };
    const res = await app.inject({
      method: "GET",
      url: `/auth/google/callback?code=abc&state=${state}`,
    });
    expect(res.statusCode).toBe(302);
    const location = res.headers.location as string;
    expect(location).toContain("runup://auth/callback#");
    expect(location).toContain("access_token=");
  });
});
