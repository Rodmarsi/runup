import type { PrismaClient } from "@runup/db";
import { errors } from "../errors.js";
import type { CreateRaceInput, UpdateRaceInput } from "./schemas.js";

export class RaceService {
  constructor(private readonly db: PrismaClient) {}

  listRaces(studentId: string) {
    return this.db.race.findMany({
      where: { studentId },
      orderBy: { raceDate: "asc" },
    });
  }

  createRace(studentId: string, input: CreateRaceInput) {
    return this.db.race.create({
      data: { studentId, ...input, raceDate: new Date(input.raceDate) },
    });
  }

  private async requireOwnRace(studentId: string, raceId: string) {
    const race = await this.db.race.findUnique({ where: { id: raceId } });
    if (!race || race.studentId !== studentId) throw errors.raceNotFound();
    return race;
  }

  async updateRace(studentId: string, raceId: string, input: UpdateRaceInput) {
    await this.requireOwnRace(studentId, raceId);
    return this.db.race.update({
      where: { id: raceId },
      data: { ...input, raceDate: input.raceDate ? new Date(input.raceDate) : undefined },
    });
  }

  async deleteRace(studentId: string, raceId: string) {
    await this.requireOwnRace(studentId, raceId);
    await this.db.race.delete({ where: { id: raceId } });
  }
}
