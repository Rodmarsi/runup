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
  const body = res.json();
  return { token: body.accessToken as string, id: body.user.id as string };
}

describe("provas", () => {
  it("aluno cria, lista, atualiza status e remove uma prova", async () => {
    const s = await register("student", "race1@runup.app");

    const created = await app.inject({
      method: "POST",
      url: "/me/races",
      headers: auth(s.token),
      payload: {
        name: "Meia de Porto Alegre",
        city: "Porto Alegre",
        state: "RS",
        raceDate: "2026-10-18",
        distanceMeters: 21097,
      },
    });
    expect(created.statusCode).toBe(201);
    const raceId = created.json().id as string;
    expect(created.json()).toMatchObject({ status: "interested" });

    const listed = await app.inject({
      method: "GET",
      url: "/me/races",
      headers: auth(s.token),
    });
    expect(listed.json()).toHaveLength(1);

    const updated = await app.inject({
      method: "PATCH",
      url: `/me/races/${raceId}`,
      headers: auth(s.token),
      payload: { status: "registered" },
    });
    expect(updated.json()).toMatchObject({ status: "registered" });

    const deleted = await app.inject({
      method: "DELETE",
      url: `/me/races/${raceId}`,
      headers: auth(s.token),
    });
    expect(deleted.statusCode).toBe(204);

    const listedAfter = await app.inject({
      method: "GET",
      url: "/me/races",
      headers: auth(s.token),
    });
    expect(listedAfter.json()).toHaveLength(0);
  });

  it("aluno não edita prova de outro aluno (404)", async () => {
    const a = await register("student", "race-a@runup.app");
    const b = await register("student", "race-b@runup.app");
    const created = await app.inject({
      method: "POST",
      url: "/me/races",
      headers: auth(a.token),
      payload: { name: "Prova A", raceDate: "2026-09-01" },
    });
    const raceId = created.json().id as string;

    const res = await app.inject({
      method: "PATCH",
      url: `/me/races/${raceId}`,
      headers: auth(b.token),
      payload: { status: "completed" },
    });
    expect(res.statusCode).toBe(404);
  });
});
