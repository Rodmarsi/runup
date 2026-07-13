-- Mantém só o melhor recorde (menor tempo) por aluno+categoria antes de
-- adicionar a constraint única, evitando quebrar se já existir duplicata.
DELETE FROM "PersonalRecord" p
USING "PersonalRecord" p2
WHERE p."studentId" = p2."studentId"
  AND p."distance" = p2."distance"
  AND (
    p."timeSeconds" > p2."timeSeconds"
    OR (p."timeSeconds" = p2."timeSeconds" AND p."id" > p2."id")
  );

-- DropIndex
DROP INDEX IF EXISTS "PersonalRecord_studentId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "PersonalRecord_studentId_distance_key" ON "PersonalRecord"("studentId", "distance");
