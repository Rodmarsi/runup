import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@runup/db";
import { errors } from "../errors.js";
import { requireRole } from "../auth/middleware.js";
import { RaceSearchService } from "./service.js";
import type { RaceSearchClient } from "./client.js";
import { searchRacesQuerySchema, importRaceSchema } from "./schemas.js";

/**
 * @param client injeta um cliente falso nos testes, pra não depender do
 * corridasbr.com.br de verdade. Em produção, omitido → usa o CorridasBrClient real.
 */
export function raceSearchRoutes(db: PrismaClient, client?: RaceSearchClient) {
  const search = new RaceSearchService(db, client);
  const asStudent = { preHandler: requireRole("student") };

  return async function (app: FastifyInstance) {
    // Busca de provas por estado (+ filtro opcional de cidade/distância mínima),
    // usando o corridasbr.com.br como catálogo.
    app.get("/races/search", asStudent, async (request) => {
      const parsed = searchRacesQuerySchema.safeParse(request.query);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      return search.search(parsed.data);
    });

    // "Adicionar ao meu calendário" — importa a prova encontrada pra Race do aluno.
    app.post("/me/races/import", asStudent, async (request, reply) => {
      const parsed = importRaceSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      const race = await search.importToStudent(
        request.authUser!.id,
        parsed.data.state,
        parsed.data.externalId,
      );
      reply.status(201).send(race);
    });
  };
}
