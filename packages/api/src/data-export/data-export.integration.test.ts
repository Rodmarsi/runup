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

describe("exportar dados", () => {
  it("exporta o que o aluno tem cadastrado", async () => {
    const token = await register("student", "export1@runup.app");
    await app.inject({
      method: "POST",
      url: "/me/workout-logs",
      headers: auth(token),
      payload: { kind: "running", distanceMeters: 5000 },
    });
    await app.inject({
      method: "POST",
      url: "/me/races",
      headers: auth(token),
      payload: { name: "Prova Teste", raceDate: "2026-12-01" },
    });

    const res = await app.inject({
      method: "GET",
      url: "/me/export",
      headers: auth(token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-disposition"]).toContain("runup-dados.json");
    const body = res.json();
    expect(body.user.email).toBe("export1@runup.app");
    expect(body.workoutLogs).toHaveLength(1);
    expect(body.races).toHaveLength(1);
    expect(body).toHaveProperty("exportedAt");
  });

  it("coach não pode exportar (403)", async () => {
    const token = await register("coach", "export-coach@runup.app");
    const res = await app.inject({
      method: "GET",
      url: "/me/export",
      headers: auth(token),
    });
    expect(res.statusCode).toBe(403);
  });
});
