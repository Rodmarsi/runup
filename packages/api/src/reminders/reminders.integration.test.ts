import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@runup/db";
import { buildApp } from "../app.js";
import { resetDb } from "../testing/reset-db.js";

const app = buildApp({ logger: false });

beforeEach(() => {
  vi.stubEnv("INTERNAL_CRON_SECRET", "teste-segredo");
  return resetDb();
});
afterAll(async () => {
  vi.unstubAllEnvs();
  await resetDb();
  await app.close();
  await prisma.$disconnect();
});

function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}

async function register(role: "student" | "coach", email: string) {
  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { name: `${role} ${email}`, email, password: "segredo123", role },
  });
  return res.json().accessToken as string;
}

describe("lembretes (endpoint interno)", () => {
  it("rejeita sem o segredo correto", async () => {
    const res = await app.inject({ method: "POST", url: "/internal/reminders/run" });
    expect(res.statusCode).toBe(403);
  });

  it("rejeita com segredo errado", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/internal/reminders/run",
      headers: { "x-cron-secret": "errado" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("com o segredo certo, roda e retorna as contagens", async () => {
    const token = await register("student", "reminder1@runup.app");
    await app.inject({
      method: "POST",
      url: "/me/races",
      headers: auth(token),
      payload: { name: "Prova Amanhã", raceDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10) },
    });

    const res = await app.inject({
      method: "POST",
      url: "/internal/reminders/run",
      headers: { "x-cron-secret": "teste-segredo" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ raceReminders: 1 });
  });
});
