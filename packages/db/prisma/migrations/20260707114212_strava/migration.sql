-- DropForeignKey
ALTER TABLE "WorkoutLog" DROP CONSTRAINT "WorkoutLog_workoutDayId_fkey";

-- AlterTable
ALTER TABLE "WorkoutLog" ADD COLUMN     "stravaActivityId" TEXT,
ALTER COLUMN "workoutDayId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutLog_stravaActivityId_key" ON "WorkoutLog"("stravaActivityId");

-- AddForeignKey
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_workoutDayId_fkey" FOREIGN KEY ("workoutDayId") REFERENCES "WorkoutDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

