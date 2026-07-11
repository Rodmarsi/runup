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

describe("gamificação", () => {
  it("ganha XP e desbloqueia a conquista do primeiro 5k ao registrar um treino avulso", async () => {
    const s = await register("student", "gam1@runup.app");

    const empty = await app.inject({
      method: "GET",
      url: "/me/gamification",
      headers: auth(s.token),
    });
    expect(empty.json()).toMatchObject({ xp: 0, level: 1, achievements: [] });
    // Missão diária/semanal já existem, zeradas.
    expect(empty.json().missions.length).toBeGreaterThan(0);

    await app.inject({
      method: "POST",
      url: "/me/workout-logs",
      headers: auth(s.token),
      payload: { kind: "running", distanceMeters: 5200, durationSeconds: 1800 },
    });

    const after = await app.inject({
      method: "GET",
      url: "/me/gamification",
      headers: auth(s.token),
    });
    const body = after.json();
    expect(body.xp).toBe(15); // 10 base + 5 (km arredondado)
    expect(body.achievements).toContain("first_5k");

    const daily = body.missions.find((m: { code: string }) => m.code === "log_today");
    expect(daily).toMatchObject({ progress: 1, target: 1 });
    expect(daily.completedAt).not.toBeNull();
  });

  it("acumula XP e sobe de nível após vários treinos", async () => {
    const s = await register("student", "gam2@runup.app");
    for (let i = 0; i < 12; i++) {
      await app.inject({
        method: "POST",
        url: "/me/workout-logs",
        headers: auth(s.token),
        payload: { kind: "running", distanceMeters: 1000 },
      });
    }
    const snap = (
      await app.inject({
        method: "GET",
        url: "/me/gamification",
        headers: auth(s.token),
      })
    ).json();
    // 12 treinos x (10 + 1) = 132 XP → nível 2 (100 XP por nível).
    expect(snap.xp).toBe(132);
    expect(snap.level).toBe(2);
  });
});
