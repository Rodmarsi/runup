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

describe("notificações", () => {
  it("registra o push token do dispositivo", async () => {
    const s = await register("student", "push1@runup.app");
    const res = await app.inject({
      method: "POST",
      url: "/me/push-token",
      headers: auth(s.token),
      payload: { token: "ExponentPushToken[fake-token-1]" },
    });
    expect(res.statusCode).toBe(204);

    const saved = await prisma.pushToken.findUnique({
      where: { token: "ExponentPushToken[fake-token-1]" },
    });
    expect(saved).toMatchObject({ userId: s.id });
  });

  it("re-registrar o mesmo token move a posse pro novo usuário (upsert)", async () => {
    const a = await register("student", "push-a@runup.app");
    const b = await register("student", "push-b@runup.app");
    const token = "ExponentPushToken[shared-device]";

    await app.inject({
      method: "POST",
      url: "/me/push-token",
      headers: auth(a.token),
      payload: { token },
    });
    await app.inject({
      method: "POST",
      url: "/me/push-token",
      headers: auth(b.token),
      payload: { token },
    });

    const saved = await prisma.pushToken.findUnique({ where: { token } });
    expect(saved).toMatchObject({ userId: b.id });
  });
});
