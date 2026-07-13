-- AlterTable
ALTER TABLE "Race" ADD COLUMN     "isTarget" BOOLEAN NOT NULL DEFAULT false;

-- Garante no máximo 1 prova alvo por aluno (índice único parcial — só
-- considera linhas com isTarget = true, então não bloqueia as demais).
CREATE UNIQUE INDEX "Race_studentId_target_key" ON "Race"("studentId") WHERE "isTarget" = true;
