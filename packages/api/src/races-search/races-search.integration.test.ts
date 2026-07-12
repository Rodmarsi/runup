import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@runup/db";
import { buildApp } from "../app.js";
import { resetDb } from "../testing/reset-db.js";
import type { RaceSearchClient, CorridasBrListItem, CorridasBrDetail } from "./client.js";

/** Cliente falso — evita bater no corridasbr.com.br de verdade nos testes. */
class FakeCorridasBrClient implements RaceSearchClient {
  async searchByState(state: string): Promise<CorridasBrListItem[]> {
    return [
      {
        externalId: "111",
        name: "Meia Maratona de Teste",
        city: "Porto Alegre",
        state,
        raceDate: "2026-09-20",
        distancesLabel: "21/10km",
        longestDistanceMeters: 21000,
      },
      {
        externalId: "222",
        name: "5k Beira-Rio",
        city: "Canoas",
        state,
        raceDate: "2026-08-15",
        distancesLabel: "5km",
        longestDistanceMeters: 5000,
      },
    ];
  }

  async getDetail(state: string, externalId: string): Promise<CorridasBrDetail> {
    return {
      externalId,
      name: "Meia Maratona de Teste",
      city: "Porto Alegre",
      state,
      raceDate: "2026-09-20",
      startLocation: "Parque Marinha do Brasil",
      distancesLabel: "21/10km",
      organizer: "Teste Eventos",
      registrationUrl: "https://www.corridasbr.com.br/siteevento.asp?c=https://exemplo.com/inscricao",
      regulationUrl: "https://www.corridasbr.com.br/RS/regulamento.asp?escolha=111",
    };
  }
}

const app = buildApp({ logger: false, raceSearchClient: new FakeCorridasBrClient() });

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
  return res.json().accessToken as string;
}

describe("busca de provas (corridasbr.com.br)", () => {
  it("busca por estado e retorna as provas encontradas", async () => {
    const token = await register("student", "search1@runup.app");
    const res = await app.inject({
      method: "GET",
      url: "/races/search?state=RS",
      headers: auth(token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(2);
  });

  it("filtra por cidade", async () => {
    const token = await register("student", "search2@runup.app");
    const res = await app.inject({
      method: "GET",
      url: "/races/search?state=RS&city=canoas",
      headers: auth(token),
    });
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0].city).toBe("Canoas");
  });

  it("filtra por distância mínima", async () => {
    const token = await register("student", "search3@runup.app");
    const res = await app.inject({
      method: "GET",
      url: "/races/search?state=RS&minDistanceMeters=20000",
      headers: auth(token),
    });
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0].externalId).toBe("111");
  });

  it("estado inválido retorna 422", async () => {
    const token = await register("student", "search4@runup.app");
    const res = await app.inject({
      method: "GET",
      url: "/races/search?state=XX",
      headers: auth(token),
    });
    expect(res.statusCode).toBe(422);
  });

  it("importa uma prova encontrada pro calendário do aluno", async () => {
    const token = await register("student", "search5@runup.app");
    const res = await app.inject({
      method: "POST",
      url: "/me/races/import",
      headers: auth(token),
      payload: { state: "RS", externalId: "111" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      name: "Meia Maratona de Teste",
      city: "Porto Alegre",
      distanceMeters: 21000,
    });

    const races = await app.inject({
      method: "GET",
      url: "/me/races",
      headers: auth(token),
    });
    expect(races.json()).toHaveLength(1);
  });
});
