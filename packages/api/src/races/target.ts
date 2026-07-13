import type { PrismaClient } from "@runup/db";

/** Marca `raceId` como prova alvo, desmarcando qualquer outra do mesmo aluno. */
export async function setAsTargetRace(db: PrismaClient, studentId: string, raceId: string) {
  const [, race] = await db.$transaction([
    db.race.updateMany({
      where: { studentId, isTarget: true, NOT: { id: raceId } },
      data: { isTarget: false },
    }),
    db.race.update({ where: { id: raceId }, data: { isTarget: true } }),
  ]);
  return race;
}
