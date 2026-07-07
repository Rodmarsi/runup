import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@runup/db";
import { buildApp } from "../app.js";
import { resetDb } from "../testing/reset-db.js";
import { buildXlsxBase64 } from "./extract.test.js";
import type { SpreadsheetInterpreter } from "./interpreter.js";
import type { InterpretedPlan } from "./schema.js";

/** Interpretador falso — evita chamar a IA de verdade nos testes. */
class FakeInterpreter implements SpreadsheetInterpreter {
  async interpret(): Promise<InterpretedPlan> {
    return {
      title: "Plano importado",
      durationWeeks: 12,
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
                { kind: "running", runningType: "easy", distanceMeters: 6000 },
              ],
            },
          ],
          sourceRef: "Plano!B2",
          confidence: "high",
        },
        {
          week: 1,
          date: "2026-07-09",
          blocks: [
            {
              kind: "free",
              role: "main",
              order: 0,
              items: [{ kind: "free", notes: "8x2' forte / 1' leve" }],
            },
          ],
          sourceRef: "Plano!B4",
          confidence: "low",
          note: "intervalo por tempo — confirmar",
        },
      ],
    };
  }
}

const app = buildApp({ logger: false, interpreter: new FakeInterpreter() });

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
  return { coach, student };
}

const sheet = buildXlsxBase64([
  ["Dia", "Treino"],
  ["Ter", "reg 6k z2"],
  ["Qui", "8x2' forte / 1' leve"],
]);

describe("importação de Excel", () => {
  it("interpreta a planilha e retorna preview com contagem de dúvidas", async () => {
    const { coach, student } = await linkedPair("x1");
    const res = await app.inject({
      method: "POST",
      url: "/coach/import/excel",
      headers: auth(coach.token),
      payload: { studentId: student.id, contentBase64: sheet },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.summary).toMatchObject({ weeks: 1, days: 2, lowConfidence: 1 });
    expect(body.plan.days[1].confidence).toBe("low");
  });

  it("não interpreta para aluno sem vínculo (403)", async () => {
    const coach = await register("coach", "coach-x2@runup.app");
    const other = await register("student", "aluno-x2@runup.app");
    const res = await app.inject({
      method: "POST",
      url: "/coach/import/excel",
      headers: auth(coach.token),
      payload: { studentId: other.id, contentBase64: sheet },
    });
    expect(res.statusCode).toBe(403);
  });

  it("confirma o plano revisado e ele aparece no calendário do aluno", async () => {
    const { coach, student } = await linkedPair("x3");
    const confirm = await app.inject({
      method: "POST",
      url: "/coach/import/excel/confirm",
      headers: auth(coach.token),
      payload: {
        studentId: student.id,
        title: "Plano importado",
        durationWeeks: 12,
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
                  { kind: "running", runningType: "easy", distanceMeters: 6000 },
                ],
              },
            ],
          },
        ],
      },
    });
    expect(confirm.statusCode).toBe(201);

    const cal = await app.inject({
      method: "GET",
      url: "/me/calendar",
      headers: auth(student.token),
    });
    expect(cal.json()).toHaveLength(1);
  });
});
