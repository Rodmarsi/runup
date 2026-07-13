import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@runup/db";
import { buildApp } from "../app.js";
import { resetDb } from "../testing/reset-db.js";
import type { StravaClient, StravaActivity, StravaTokens } from "./client.js";

/** Cliente Strava falso — controla tokens e atividades sem rede. */
class FakeStravaClient implements StravaClient {
  activities: StravaActivity[] = [];
  refreshed = false;
  private exp: Date;

  constructor(expiresAt: Date) {
    this.exp = expiresAt;
  }

  async exchangeCode(): Promise<StravaTokens> {
    return {
      athleteId: "athlete-1",
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresAt: this.exp,
    };
  }

  async refresh(): Promise<StravaTokens> {
    this.refreshed = true;
    return {
      athleteId: "",
      accessToken: "access-2",
      refreshToken: "refresh-2",
      expiresAt: new Date(Date.now() + 3600_000),
    };
  }

  async listActivities(): Promise<StravaActivity[]> {
    return this.activities;
  }
}

let fake: FakeStravaClient;

function makeApp() {
  return buildApp({ logger: false, stravaClient: fake });
}

beforeEach(async () => {
  await resetDb();
  fake = new FakeStravaClient(new Date(Date.now() + 3600_000));
});

let appRef: ReturnType<typeof buildApp> | null = null;
afterAll(async () => {
  await resetDb();
  if (appRef) await appRef.close();
  await prisma.$disconnect();
});

function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}

async function registerStudent(app: ReturnType<typeof buildApp>, email: string) {
  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { name: "Aluno", email, password: "segredo123", role: "student" },
  });
  const b = res.json();
  return { token: b.accessToken as string, id: b.user.id as string };
}

describe("conexão e sync do Strava", () => {
  it("conecta e reporta status", async () => {
    const app = makeApp();
    appRef = app;
    const s = await registerStudent(app, "strava1@runup.app");
    await app.inject({
      method: "POST",
      url: "/me/strava/connect",
      headers: auth(s.token),
      payload: { code: "oauth-code" },
    });
    const status = await app.inject({
      method: "GET",
      url: "/me/strava",
      headers: auth(s.token),
    });
    expect(status.json()).toMatchObject({ connected: true, athleteId: "athlete-1" });
    await app.close();
  });

  it("sync sem conexão retorna 400", async () => {
    const app = makeApp();
    appRef = app;
    const s = await registerStudent(app, "strava2@runup.app");
    const res = await app.inject({
      method: "POST",
      url: "/me/strava/sync",
      headers: auth(s.token),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe("STRAVA_NOT_CONNECTED");
    await app.close();
  });

  it("casa a atividade com o dia planejado e cria log source=strava", async () => {
    const app = makeApp();
    appRef = app;
    // aluno + treinador vinculado + plano com um dia em 2026-07-07
    const coach = (
      await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          name: "Coach",
          email: "coach-str@runup.app",
          password: "segredo123",
          role: "coach",
        },
      })
    ).json();
    const student = await registerStudent(app, "aluno-str@runup.app");
    await app.inject({
      method: "POST",
      url: "/coach/students/invite",
      headers: auth(coach.accessToken),
      payload: { studentEmail: "aluno-str@runup.app" },
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
    await app.inject({
      method: "POST",
      url: "/plans",
      headers: auth(coach.accessToken),
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
                items: [{ kind: "running", runningType: "easy" }],
              },
            ],
          },
        ],
      },
    });

    await app.inject({
      method: "POST",
      url: "/me/strava/connect",
      headers: auth(student.token),
      payload: { code: "oauth-code" },
    });

    fake.activities = [
      {
        id: "act-1",
        name: "Corrida matinal",
        startDate: "2026-07-07T09:00:00.000Z",
        distanceMeters: 10000,
        movingTimeSeconds: 2832,
        averageHeartrate: 155,
        mapPolyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
      },
    ];

    const sync = await app.inject({
      method: "POST",
      url: "/me/strava/sync",
      headers: auth(student.token),
    });
    expect(sync.json()).toMatchObject({ imported: 1, matched: 1, standalone: 0 });

    // O dia ficou concluído e a estimativa/estatística enxerga o log.
    const cal = await app.inject({
      method: "GET",
      url: "/me/calendar",
      headers: auth(student.token),
    });
    expect(cal.json()[0].status).toBe("done");

    // Nome e traçado da corrida vieram do Strava junto com o resto.
    const logs = await app.inject({
      method: "GET",
      url: "/me/workout-logs",
      headers: auth(student.token),
    });
    expect(logs.json()[0]).toMatchObject({
      stravaName: "Corrida matinal",
      mapPolyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
    });

    // Re-sync não duplica (dedupe por stravaActivityId).
    const resync = await app.inject({
      method: "POST",
      url: "/me/strava/sync",
      headers: auth(student.token),
    });
    expect(resync.json().imported).toBe(0);
    await app.close();
  });

  it("atividade sem dia planejado vira avulsa e atualiza RP", async () => {
    const app = makeApp();
    appRef = app;
    const s = await registerStudent(app, "strava-solo@runup.app");
    await app.inject({
      method: "POST",
      url: "/me/strava/connect",
      headers: auth(s.token),
      payload: { code: "oauth-code" },
    });
    fake.activities = [
      {
        id: "act-solo",
        startDate: "2026-07-01T09:00:00.000Z",
        distanceMeters: 10050, // ~10k, dentro da tolerância
        movingTimeSeconds: 2700,
      },
    ];
    const sync = await app.inject({
      method: "POST",
      url: "/me/strava/sync",
      headers: auth(s.token),
    });
    expect(sync.json()).toMatchObject({ standalone: 1, matched: 0, prsUpdated: 1 });

    const prs = await app.inject({
      method: "GET",
      url: "/me/personal-records",
      headers: auth(s.token),
    });
    expect(prs.json()[0]).toMatchObject({ distance: "10k", timeSeconds: 2700 });

    // Atividade avulsa deve contar nas estatísticas (não só treinos planejados).
    const stats = await app.inject({
      method: "GET",
      url: "/me/stats",
      headers: auth(s.token),
    });
    expect(stats.json()).toMatchObject({
      workoutCount: 1,
      totalDistanceMeters: 10050,
    });
    await app.close();
  });

  it("renova o token expirado antes de sincronizar", async () => {
    fake = new FakeStravaClient(new Date(Date.now() - 1000)); // já expirado
    const app = makeApp();
    appRef = app;
    const s = await registerStudent(app, "strava-exp@runup.app");
    await app.inject({
      method: "POST",
      url: "/me/strava/connect",
      headers: auth(s.token),
      payload: { code: "oauth-code" },
    });
    await app.inject({
      method: "POST",
      url: "/me/strava/sync",
      headers: auth(s.token),
    });
    expect(fake.refreshed).toBe(true);
    await app.close();
  });
});
