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

/** Cria um par treinador↔aluno já com vínculo ativo. */
async function linkedPair(suffix: string) {
  const coach = await register("coach", `coach-${suffix}@runup.app`);
  const student = await register("student", `aluno-${suffix}@runup.app`);
  await app.inject({
    method: "POST",
    url: "/coach/students/invite",
    headers: auth(coach.token),
    payload: { studentEmail: `aluno-${suffix}@runup.app` },
  });
  const inv = await app.inject({
    method: "GET",
    url: "/student/invites",
    headers: auth(student.token),
  });
  const linkId = inv.json()[0].id;
  await app.inject({
    method: "POST",
    url: `/student/invites/${linkId}/accept`,
    headers: auth(student.token),
  });
  return { coach, student };
}

const samplePlan = (studentId: string) => ({
  studentId,
  title: "Plano Meia PoA",
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
            {
              kind: "running",
              runningType: "intervals",
              targetPaceSecPerKm: 270,
              interval: { reps: 10, repDistanceMeters: 400, recoverySeconds: 90 },
            },
          ],
        },
      ],
    },
    {
      week: 1,
      date: "2026-07-09",
      blocks: [
        {
          kind: "running",
          role: "main",
          order: 0,
          items: [
            { kind: "running", runningType: "long", distanceMeters: 14000 },
          ],
        },
      ],
    },
  ],
});

async function createPlan(coachToken: string, studentId: string) {
  return app.inject({
    method: "POST",
    url: "/plans",
    headers: auth(coachToken),
    payload: samplePlan(studentId),
  });
}

describe("criação e atribuição de plano", () => {
  it("treinador cria plano para aluno vinculado e aparece no calendário", async () => {
    const { coach, student } = await linkedPair("p1");
    const res = await createPlan(coach.token, student.id);
    expect(res.statusCode).toBe(201);

    const cal = await app.inject({
      method: "GET",
      url: "/me/calendar",
      headers: auth(student.token),
    });
    expect(cal.statusCode).toBe(200);
    expect(cal.json()).toHaveLength(2);
  });

  it("não cria plano para aluno sem vínculo (403)", async () => {
    const coach = await register("coach", "coach-nl@runup.app");
    const other = await register("student", "aluno-nl@runup.app");
    const res = await createPlan(coach.token, other.id);
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe("NOT_LINKED");
  });

  it("aluno não pode criar plano (403)", async () => {
    const { student } = await linkedPair("p3");
    const res = await app.inject({
      method: "POST",
      url: "/plans",
      headers: auth(student.token),
      payload: samplePlan(student.id),
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("check-in com feedback", () => {
  it("aluno registra execução com RPE e notas; status do dia atualiza", async () => {
    const { coach, student } = await linkedPair("l1");
    await createPlan(coach.token, student.id);
    const dayId = (
      await app.inject({
        method: "GET",
        url: "/me/calendar",
        headers: auth(student.token),
      })
    ).json()[0].id;

    const log = await app.inject({
      method: "POST",
      url: `/workout-days/${dayId}/log`,
      headers: auth(student.token),
      payload: {
        status: "done",
        distanceMeters: 6480,
        durationSeconds: 2492,
        perceivedEffort: 7,
        pain: "nenhuma",
        notes: "ritmo bom até o 8º tiro",
      },
    });
    expect(log.statusCode).toBe(201);
    expect(log.json()).toMatchObject({ perceivedEffort: 7, source: "manual" });

    const day = await app.inject({
      method: "GET",
      url: `/workout-days/${dayId}`,
      headers: auth(student.token),
    });
    expect(day.json().status).toBe("done");
  });

  it("aluno não registra dia de outro aluno (404)", async () => {
    const { coach, student } = await linkedPair("l2");
    await createPlan(coach.token, student.id);
    const dayId = (
      await app.inject({
        method: "GET",
        url: "/me/calendar",
        headers: auth(student.token),
      })
    ).json()[0].id;

    const intruso = await register("student", "intruso-l2@runup.app");
    const res = await app.inject({
      method: "POST",
      url: `/workout-days/${dayId}/log`,
      headers: auth(intruso.token),
      payload: { status: "done" },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("comentários no treino", () => {
  it("treinador e aluno comentam no mesmo dia", async () => {
    const { coach, student } = await linkedPair("c1");
    await createPlan(coach.token, student.id);
    const dayId = (
      await app.inject({
        method: "GET",
        url: "/me/calendar",
        headers: auth(student.token),
      })
    ).json()[0].id;

    const byCoach = await app.inject({
      method: "POST",
      url: `/workout-days/${dayId}/comments`,
      headers: auth(coach.token),
      payload: { text: "foca na constância dos 5 primeiros" },
    });
    expect(byCoach.statusCode).toBe(201);

    const byStudent = await app.inject({
      method: "POST",
      url: `/workout-days/${dayId}/comments`,
      headers: auth(student.token),
      payload: { text: "senti o joelho no fim" },
    });
    expect(byStudent.statusCode).toBe(201);

    const day = await app.inject({
      method: "GET",
      url: `/workout-days/${dayId}`,
      headers: auth(student.token),
    });
    expect(day.json().comments).toHaveLength(2);
  });
});

describe("metas e overview", () => {
  it("aluno cria meta e vê o overview por semanas", async () => {
    const { coach, student } = await linkedPair("g1");
    const plan = (await createPlan(coach.token, student.id)).json();

    const goal = await app.inject({
      method: "POST",
      url: "/goals",
      headers: auth(student.token),
      payload: {
        studentId: student.id,
        planId: plan.id,
        targetRace: "21k",
        raceName: "Meia de Porto Alegre",
        raceDate: "2026-08-11",
        targetTimeSeconds: 6600,
      },
    });
    expect(goal.statusCode).toBe(201);

    const overview = await app.inject({
      method: "GET",
      url: `/goals/${goal.json().id}/overview`,
      headers: auth(student.token),
    });
    expect(overview.statusCode).toBe(200);
    const body = overview.json();
    expect(body.goal.targetRace).toBe("21k");
    expect(body.weeks[0]).toMatchObject({ week: 1, totalDays: 2 });
  });

  it("overview traz estimativa de tempo a partir de treino logado", async () => {
    const { coach, student } = await linkedPair("g3");
    const plan = (await createPlan(coach.token, student.id)).json();

    // Loga um esforço com distância + tempo (10 km em 47:12).
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
      payload: { status: "done", distanceMeters: 10000, durationSeconds: 2832 },
    });

    const goal = (
      await app.inject({
        method: "POST",
        url: "/goals",
        headers: auth(student.token),
        payload: {
          studentId: student.id,
          planId: plan.id,
          targetRace: "21k",
          raceDate: "2026-08-11",
        },
      })
    ).json();

    const overview = (
      await app.inject({
        method: "GET",
        url: `/goals/${goal.id}/overview`,
        headers: auth(student.token),
      })
    ).json();

    expect(overview.estimate.targetDistanceMeters).toBe(21097);
    expect(typeof overview.estimate.currentSeconds).toBe("number");
    // 10k em 47:12 → meia ~ 1h44 (entre 90min e 120min).
    expect(overview.estimate.currentSeconds).toBeGreaterThan(5400);
    expect(overview.estimate.currentSeconds).toBeLessThan(7200);
    expect(overview.estimate.byWeek[0]).toMatchObject({ week: 1 });
  });

  it("aluno não cria meta para outro aluno (403)", async () => {
    const { student } = await linkedPair("g2");
    const other = await register("student", "outro-g2@runup.app");
    const res = await app.inject({
      method: "POST",
      url: "/goals",
      headers: auth(student.token),
      payload: {
        studentId: other.id,
        targetRace: "10k",
        raceDate: "2026-09-01",
      },
    });
    expect(res.statusCode).toBe(403);
  });
});
