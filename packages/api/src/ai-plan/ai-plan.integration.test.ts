import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@runup/db";
import { buildApp } from "../app.js";
import { resetDb } from "../testing/reset-db.js";
import { MockPlanGenerator } from "./mock-generator.js";

const app = buildApp({ logger: false, aiPlanGenerator: new MockPlanGenerator() });

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

describe("criar com IA", () => {
  it("gera um preview cobrindo todas as datas pedidas", async () => {
    const s = await register("student", "ia1@runup.app");
    const res = await app.inject({
      method: "POST",
      url: "/me/plans/ai-generate",
      headers: auth(s.token),
      payload: {
        objective: "sub 50 nos 10km",
        experience: "intermediate",
        availableWeekdays: [1, 3, 6], // seg, qua, sáb
        durationWeeks: 2,
        startDate: "2026-08-03", // uma segunda-feira
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.summary).toMatchObject({ weeks: 2, days: 6 });
    expect(body.plan.days).toHaveLength(6);
  });

  it("coach não pode gerar plano por IA pra si (403)", async () => {
    const coach = await register("coach", "ia-coach@runup.app");
    const res = await app.inject({
      method: "POST",
      url: "/me/plans/ai-generate",
      headers: auth(coach.token),
      payload: {
        objective: "correr mais",
        experience: "beginner",
        availableWeekdays: [1],
        durationWeeks: 1,
        startDate: "2026-08-03",
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("confirma o plano gerado (POST /me/plans) e ele aparece no calendário", async () => {
    const s = await register("student", "ia2@runup.app");
    const preview = await app.inject({
      method: "POST",
      url: "/me/plans/ai-generate",
      headers: auth(s.token),
      payload: {
        objective: "primeira meia",
        experience: "advanced",
        availableWeekdays: [2, 4],
        durationWeeks: 1,
        startDate: "2026-08-03",
      },
    });
    const { plan } = preview.json();

    const confirm = await app.inject({
      method: "POST",
      url: "/me/plans",
      headers: auth(s.token),
      payload: {
        title: plan.title,
        durationWeeks: plan.durationWeeks,
        days: plan.days.map((d: { week: number; date: string; blocks: unknown }) => ({
          week: d.week,
          date: d.date,
          blocks: d.blocks,
        })),
      },
    });
    expect(confirm.statusCode).toBe(201);

    const cal = await app.inject({
      method: "GET",
      url: "/me/calendar",
      headers: auth(s.token),
    });
    expect(cal.json()).toHaveLength(2);
  });
});

describe("aluno cria treino manualmente", () => {
  it("agenda um treino futuro sem precisar de treinador", async () => {
    const s = await register("student", "manual1@runup.app");
    const res = await app.inject({
      method: "POST",
      url: "/me/plans",
      headers: auth(s.token),
      payload: {
        title: "Musculação",
        durationWeeks: 1,
        days: [
          {
            week: 1,
            date: "2026-08-10",
            blocks: [
              {
                kind: "strength",
                role: "main",
                order: 0,
                items: [{ kind: "free", notes: "Musculação: treino de pernas — foco em posterior" }],
              },
            ],
          },
        ],
      },
    });
    expect(res.statusCode).toBe(201);

    const cal = await app.inject({
      method: "GET",
      url: "/me/calendar",
      headers: auth(s.token),
    });
    expect(cal.json()).toHaveLength(1);
    expect(cal.json()[0].blocks[0].kind).toBe("strength");
  });
});
