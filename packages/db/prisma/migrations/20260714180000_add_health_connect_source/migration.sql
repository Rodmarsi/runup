-- AlterEnum
ALTER TYPE "WorkoutLogSource" ADD VALUE 'health_connect';

-- AlterTable
ALTER TABLE "WorkoutLog" ADD COLUMN "healthConnectId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutLog_healthConnectId_key" ON "WorkoutLog"("healthConnectId");
