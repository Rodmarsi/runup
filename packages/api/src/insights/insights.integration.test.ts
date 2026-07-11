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

describe("insights", () => {
  it("sem histórico, não gera nenhum insight", async () => {
    const s = await register("student", "insight1@runup.app");
    const res = await app.inject({
      method: "GET",
      url: "/me/insights",
      headers: auth(s.token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("avisa quando o tênis já bateu o km de alerta", async () => {
    const s = await register("student", "insight2@runup.app");
    await app.inject({
      method: "POST",
      url: "/me/shoes",
      headers: auth(s.token),
      payload: { name: "Pegasus 40", alertKm: 500 },
    });
    const shoe = (
      await app.inject({ method: "GET", url: "/me/shoes", headers: auth(s.token) })
    ).json()[0];
    await app.inject({
      method: "PATCH",
      url: `/me/shoes/${shoe.id}`,
      headers: auth(s.token),
      payload: { totalKm: 550 },
    });

    const res = await app.inject({
      method: "GET",
      url: "/me/insights",
      headers: auth(s.token),
    });
    const insights = res.json();
    expect(insights.some((i: { id: string }) => i.id === `shoe-${shoe.id}`)).toBe(true);
  });
});
