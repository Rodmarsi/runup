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

describe("equipamentos (tênis)", () => {
  it("aluno cria, lista, atualiza e remove um tênis", async () => {
    const s = await register("student", "shoe1@runup.app");

    const created = await app.inject({
      method: "POST",
      url: "/me/shoes",
      headers: auth(s.token),
      payload: { name: "Pegasus 40", brand: "Nike", alertKm: 600 },
    });
    expect(created.statusCode).toBe(201);
    const shoeId = created.json().id as string;

    const listed = await app.inject({
      method: "GET",
      url: "/me/shoes",
      headers: auth(s.token),
    });
    expect(listed.json()).toHaveLength(1);
    expect(listed.json()[0]).toMatchObject({ name: "Pegasus 40", totalKm: 0 });

    const updated = await app.inject({
      method: "PATCH",
      url: `/me/shoes/${shoeId}`,
      headers: auth(s.token),
      payload: { totalKm: 620 },
    });
    expect(updated.json()).toMatchObject({ totalKm: 620 });

    const retired = await app.inject({
      method: "PATCH",
      url: `/me/shoes/${shoeId}`,
      headers: auth(s.token),
      payload: { retired: true },
    });
    expect(retired.json().retiredAt).not.toBeNull();

    const deleted = await app.inject({
      method: "DELETE",
      url: `/me/shoes/${shoeId}`,
      headers: auth(s.token),
    });
    expect(deleted.statusCode).toBe(204);

    const listedAfter = await app.inject({
      method: "GET",
      url: "/me/shoes",
      headers: auth(s.token),
    });
    expect(listedAfter.json()).toHaveLength(0);
  });

  it("aluno não edita tênis de outro aluno (404)", async () => {
    const a = await register("student", "shoe-a@runup.app");
    const b = await register("student", "shoe-b@runup.app");
    const created = await app.inject({
      method: "POST",
      url: "/me/shoes",
      headers: auth(a.token),
      payload: { name: "Vaporfly" },
    });
    const shoeId = created.json().id as string;

    const res = await app.inject({
      method: "PATCH",
      url: `/me/shoes/${shoeId}`,
      headers: auth(b.token),
      payload: { totalKm: 10 },
    });
    expect(res.statusCode).toBe(404);
  });

  it("registrar um treino com tênis soma km e aparece nas estatísticas do tênis", async () => {
    const s = await register("student", "shoe-log@runup.app");
    const shoe = await app.inject({
      method: "POST",
      url: "/me/shoes",
      headers: auth(s.token),
      payload: { name: "Speedzone", brand: "Fila", model: "Racer speedzone", color: "Laranja" },
    });
    const shoeId = shoe.json().id as string;

    await app.inject({
      method: "POST",
      url: "/me/workout-logs",
      headers: auth(s.token),
      payload: { kind: "running", distanceMeters: 5000, durationSeconds: 1500, shoeId },
    });

    const listed = await app.inject({
      method: "GET",
      url: "/me/shoes",
      headers: auth(s.token),
    });
    expect(listed.json()[0]).toMatchObject({
      totalKm: 5,
      runCount: 1,
      totalTimeSeconds: 1500,
      color: "Laranja",
    });
  });

  it("não soma km num tênis de outro aluno (404)", async () => {
    const a = await register("student", "shoe-log-a@runup.app");
    const b = await register("student", "shoe-log-b@runup.app");
    const shoe = await app.inject({
      method: "POST",
      url: "/me/shoes",
      headers: auth(a.token),
      payload: { name: "Vaporfly" },
    });
    const shoeId = shoe.json().id as string;

    const res = await app.inject({
      method: "POST",
      url: "/me/workout-logs",
      headers: auth(b.token),
      payload: { kind: "running", distanceMeters: 5000, shoeId },
    });
    expect(res.statusCode).toBe(404);
  });
});
