import type { PrismaClient } from "@runup/db";
import { errors } from "../errors.js";
import { PlanRecalculationService } from "../plans/recalculation-service.js";
import type { CreateRaceInput, UpdateRaceInput } from "./schemas.js";

export class RaceService {
  private readonly recalculation: PlanRecalculationService;

  constructor(private readonly db: PrismaClient) {
    this.recalculation = new PlanRecalculationService(db);
  }

  listRaces(studentId: string) {
    return this.db.race.findMany({
      where: { studentId },
      orderBy: { raceDate: "asc" },
    });
  }

  async createRace(studentId: string, input: CreateRaceInput) {
    const race = await this.db.race.create({
      data: { studentId, ...input, raceDate: new Date(input.raceDate) },
    });
    // Recálculo automático: ajusta o plano já agendado do aluno pra essa prova nova.
    await this.recalculation.recalculateForRace(studentId, race.raceDate);
    return race;
  }

  private async requireOwnRace(studentId: string, raceId: string) {
    const race = await this.db.race.findUnique({ where: { id: raceId } });
    if (!race || race.studentId !== studentId) throw errors.raceNotFound();
    return race;
  }

  async updateRace(studentId: string, raceId: string, input: UpdateRaceInput) {
    await this.requireOwnRace(studentId, raceId);
    const race = await this.db.race.update({
      where: { id: raceId },
      data: { ...input, raceDate: input.raceDate ? new Date(input.raceDate) : undefined },
    });
    // Data mudou — recalcula o plano pra nova data.
    if (input.raceDate) {
      await this.recalculation.recalculateForRace(studentId, race.raceDate);
    }
    return race;
  }

  async deleteRace(studentId: string, raceId: string) {
    await this.requireOwnRace(studentId, raceId);
    await this.db.race.delete({ where: { id: raceId } });
  }
}
