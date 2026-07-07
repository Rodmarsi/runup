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

async function linkedPair(suffix: string) {
  const coach = await register("coach", `coach-${suffix}@runup.app`);
  const student = await register("student", `aluno-${suffix}@runup.app`);
  await app.inject({
    method: "POST",
    url: "/coach/students/invite",
    headers: auth(coach.token),
    payload: { studentEmail: `aluno-${suffix}@runup.app` },
  });
  const linkId = (
    await app.inject({
      method: "GET",
      url: "/student/invites",
      headers: auth(student.token),
    })
  ).json()[0].id;
  await app.inject({
    method: "POST",
    url: `/student/invites/${linkId}/accept`,
    headers: auth(student.token),
  });
  return { coach, student, linkId };
}

describe("perfil: métricas e recordes", () => {
  it("aluno registra e lista peso e RPs", async () => {
    const s = await register("student", "prof1@runup.app");
    await app.inject({
      method: "POST",
      url: "/me/body-metrics",
      headers: auth(s.token),
      payload: { date: "2026-07-01", weightKg: 72.5 },
    });
    await app.inject({
      method: "POST",
      url: "/me/personal-records",
      headers: auth(s.token),
      payload: { distance: "10k", timeSeconds: 2832, achievedAt: "2026-06-01" },
    });

    const metrics = await app.inject({
      method: "GET",
      url: "/me/body-metrics",
      headers: auth(s.token),
    });
    expect(metrics.json()).toHaveLength(1);

    const prs = await app.inject({
      method: "GET",
      url: "/me/personal-records",
      headers: auth(s.token),
    });
    expect(prs.json()[0]).toMatchObject({ distance: "10k", timeSeconds: 2832 });
  });
});

describe("estatísticas", () => {
  it("agrega distância e conta treinos concluídos", async () => {
    const { coach, student } = await linkedPair("st1");

    // Plano com um dia; aluno loga com distância + tempo.
    await app.inject({
      method: "POST",
      url: "/plans",
      headers: auth(coach.token),
      payload: {
        studentId: student.id,
        title: "Plano",
        durationWeeks: 4,
        startDate: "2026-07-06",
        days: [
          {
            week: 1,
            date: "2026-07-07",
            blocks: [
              {
                kind: "running",
                role: "main",
                order: 0,
                items: [
                  { kind: "running", runningType: "easy", distanceMeters: 8000 },
                ],
              },
            ],
          },
        ],
      },
    });
    const dayId = (
      await app.inject({
        method: "GET",
        url: "/me/calendar",
        headers: auth(student.token),
      })
    ).json()[0].id;
    await app.inject({
      method: "POST",
      url: `/workout-days/${dayId}/log`,
      headers: auth(student.token),
      payload: { status: "done", distanceMeters: 8000, durationSeconds: 2880 },
    });

    const stats = (
      await app.inject({
        method: "GET",
        url: "/me/stats",
        headers: auth(student.token),
      })
    ).json();
    expect(stats.totalDistanceMeters).toBe(8000);
    expect(stats.workoutCount).toBe(1);
    expect(stats.avgPaceSecPerKm).toBe(360);
  });
});

describe("mensagens", () => {
  it("treinador e aluno trocam mensagens no vínculo", async () => {
    const { coach, student, linkId } = await linkedPair("msg1");

    await app.inject({
      method: "POST",
      url: `/conversations/${linkId}/messages`,
      headers: auth(coach.token),
      payload: { text: "bom treino hoje!" },
    });
    const send = await app.inject({
      method: "POST",
      url: `/conversations/${linkId}/messages`,
      headers: auth(student.token),
      payload: { text: "valeu, treinador" },
    });
    expect(send.statusCode).toBe(201);

    const list = await app.inject({
      method: "GET",
      url: `/conversations/${linkId}/messages`,
      headers: auth(student.token),
    });
    expect(list.json()).toHaveLength(2);
  });

  it("terceiro não acessa conversa alheia (403)", async () => {
    const { linkId } = await linkedPair("msg2");
    const intruso = await register("coach", "intruso-msg@runup.app");
    const res = await app.inject({
      method: "GET",
      url: `/conversations/${linkId}/messages`,
      headers: auth(intruso.token),
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("alertas de aderência", () => {
  it("acusa aluno com 3 treinos pulados em sequência", async () => {
    const { coach, student } = await linkedPair("adh1");
    await app.inject({
      method: "POST",
      url: "/plans",
      headers: auth(coach.token),
      payload: {
        studentId: student.id,
        title: "Plano",
        durationWeeks: 4,
        startDate: "2020-01-01",
        days: [1, 2, 3].map((n) => ({
          week: 1,
          date: `2020-01-0${n}`,
          blocks: [
            {
              kind: "running",
              role: "main",
              order: 0,
              items: [{ kind: "free", notes: "corrida" }],
            },
          ],
        })),
      },
    });

    const alerts = (
      await app.inject({
        method: "GET",
        url: "/coach/alerts",
        headers: auth(coach.token),
      })
    ).json();
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      studentId: student.id,
      consecutiveMissed: 3,
    });
  });

  it("sem alerta quando não há treinos pulados", async () => {
    const { coach } = await linkedPair("adh2");
    const alerts = (
      await app.inject({
        method: "GET",
        url: "/coach/alerts",
        headers: auth(coach.token),
      })
    ).json();
    expect(alerts).toHaveLength(0);
  });
});
