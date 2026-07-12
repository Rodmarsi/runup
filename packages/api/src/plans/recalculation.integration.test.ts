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

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
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
    await app.inject({ method: "GET", url: "/student/invites", headers: auth(student.token) })
  ).json()[0].id;
  await app.inject({
    method: "POST",
    url: `/student/invites/${linkId}/accept`,
    headers: auth(student.token),
  });
  return { coach, student };
}

describe("recálculo automático do plano ao cadastrar uma prova", () => {
  it("reduz a carga dos dias de corrida na janela de taper antes da prova", async () => {
    const { coach, student } = await linkedPair("recalc1");

    const runningDay = (date: string, distanceMeters: number, runningType = "long") => ({
      week: 1,
      date,
      blocks: [
        {
          kind: "running",
          role: "main",
          order: 0,
          items: [{ kind: "running", runningType, distanceMeters }],
        },
      ],
    });

    await app.inject({
      method: "POST",
      url: "/plans",
      headers: auth(coach.token),
      payload: {
        studentId: student.id,
        title: "Plano com prova",
        durationWeeks: 4,
        startDate: isoDaysFromNow(1),
        days: [
          runningDay(isoDaysFromNow(9), 10000), // véspera da prova (daysBefore=1)
          runningDay(isoDaysFromNow(7), 16000, "tempo"), // 3 dias antes
          runningDay(isoDaysFromNow(2), 10000), // taper gradual (daysBefore=8)
        ],
      },
    });

    const before = await app.inject({
      method: "GET",
      url: "/me/calendar",
      headers: auth(student.token),
    });
    const daysBefore = before.json();
    expect(daysBefore).toHaveLength(3);

    // Aluno cadastra a prova pra daqui a 10 dias — dispara o recálculo.
    const race = await app.inject({
      method: "POST",
      url: "/me/races",
      headers: auth(student.token),
      payload: { name: "Prova Alvo", raceDate: isoDaysFromNow(10) },
    });
    expect(race.statusCode).toBe(201);

    const after = await app.inject({
      method: "GET",
      url: "/me/calendar",
      headers: auth(student.token),
    });
    const daysAfter = after.json().sort((a: { date: string }, b: { date: string }) =>
      a.date.localeCompare(b.date),
    );

    const vespera = daysAfter.find((d: { date: string }) => d.date.slice(0, 10) === isoDaysFromNow(9));
    expect(vespera.mandatoryRecovery).toBe(true);
    expect(vespera.blocks[0].items[0].runningType).toBe("recovery");
    expect(vespera.blocks[0].items[0].distanceMeters).toBeLessThan(10000);

    const tresDias = daysAfter.find((d: { date: string }) => d.date.slice(0, 10) === isoDaysFromNow(7));
    expect(tresDias.blocks[0].items[0].runningType).toBe("easy");
    expect(tresDias.blocks[0].items[0].distanceMeters).toBeLessThan(16000);

    const gradual = daysAfter.find((d: { date: string }) => d.date.slice(0, 10) === isoDaysFromNow(2));
    expect(gradual.blocks[0].items[0].distanceMeters).toBeLessThan(10000);
    expect(gradual.blocks[0].items[0].distanceMeters).toBeGreaterThan(6000);
  });

  it("não mexe em dias já concluídos", async () => {
    const { coach, student } = await linkedPair("recalc2");

    await app.inject({
      method: "POST",
      url: "/plans",
      headers: auth(coach.token),
      payload: {
        studentId: student.id,
        title: "Plano",
        durationWeeks: 4,
        startDate: isoDaysFromNow(1),
        days: [
          {
            week: 1,
            date: isoDaysFromNow(2),
            blocks: [
              {
                kind: "running",
                role: "main",
                order: 0,
                items: [{ kind: "running", runningType: "long", distanceMeters: 10000 }],
              },
            ],
          },
        ],
      },
    });

    const dayId = (
      await app.inject({ method: "GET", url: "/me/calendar", headers: auth(student.token) })
    ).json()[0].id;

    await app.inject({
      method: "POST",
      url: `/workout-days/${dayId}/log`,
      headers: auth(student.token),
      payload: { status: "done", distanceMeters: 10000 },
    });

    await app.inject({
      method: "POST",
      url: "/me/races",
      headers: auth(student.token),
      payload: { name: "Prova Alvo", raceDate: isoDaysFromNow(10) },
    });

    const day = (
      await app.inject({ method: "GET", url: "/me/calendar", headers: auth(student.token) })
    ).json()[0];
    expect(day.blocks[0].items[0].distanceMeters).toBe(10000);
  });
});
