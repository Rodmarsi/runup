import type { PrismaClient } from "@runup/db";
import { errors } from "../errors.js";
import { PlanRecalculationService } from "../plans/recalculation-service.js";
import {
  CorridasBrClient,
  parseLongestDistanceMeters,
  type CorridasBrListItem,
  type RaceSearchClient,
} from "./client.js";
import type { SearchRacesQuery } from "./schemas.js";

interface CacheEntry {
  items: CorridasBrListItem[];
  fetchedAt: number;
}

// corridasbr não muda a cada minuto — evita bater no site a cada busca.
const CACHE_TTL_MS = 30 * 60 * 1000;

/** Busca de provas usando o corridasbr.com.br como fonte de dados (sem API oficial). */
export class RaceSearchService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly recalculation: PlanRecalculationService;

  constructor(
    private readonly db: PrismaClient,
    private readonly client: RaceSearchClient = new CorridasBrClient(),
  ) {
    this.recalculation = new PlanRecalculationService(db);
  }

  async search(query: SearchRacesQuery): Promise<CorridasBrListItem[]> {
    const cached = this.cache.get(query.state);
    const items =
      cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS
        ? cached.items
        : await this.client.searchByState(query.state).then((fresh) => {
            this.cache.set(query.state, { items: fresh, fetchedAt: Date.now() });
            return fresh;
          });

    return items.filter((item) => {
      if (query.city && !item.city.toLowerCase().includes(query.city.toLowerCase())) {
        return false;
      }
      if (
        query.minDistanceMeters &&
        (item.longestDistanceMeters ?? 0) < query.minDistanceMeters
      ) {
        return false;
      }
      return true;
    });
  }

  /** "Adicionar ao meu calendário" — importa uma prova encontrada na busca pro Race do aluno. */
  async importToStudent(studentId: string, state: string, externalId: string) {
    const detail = await this.client.getDetail(state, externalId);
    if (!detail.raceDate) throw errors.raceImportFailed();

    const race = await this.db.race.create({
      data: {
        studentId,
        name: detail.name || "Prova sem nome",
        city: detail.city ?? undefined,
        state: detail.state,
        raceDate: new Date(detail.raceDate),
        distanceMeters: detail.distancesLabel
          ? (parseLongestDistanceMeters(detail.distancesLabel) ?? undefined)
          : undefined,
        courseUrl: detail.regulationUrl ?? undefined,
        registrationUrl: detail.registrationUrl ?? undefined,
      },
    });
    await this.recalculation.recalculateForRace(studentId, race.raceDate);
    return race;
  }
}
