-- CreateEnum
CREATE TYPE "WorkoutLogKind" AS ENUM ('running', 'strength', 'mobility', 'bike', 'walk', 'other');

-- CreateEnum
CREATE TYPE "RaceStatus" AS ENUM ('interested', 'registered', 'completed');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "MissionPeriod" AS ENUM ('daily', 'weekly');

-- AlterTable
ALTER TABLE "WorkoutDay" ADD COLUMN     "mandatoryRecovery" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WorkoutLog" ADD COLUMN     "caloriesKcal" INTEGER,
ADD COLUMN     "kind" "WorkoutLogKind" NOT NULL DEFAULT 'running',
ADD COLUMN     "shoeId" TEXT,
ADD COLUMN     "weather" TEXT;

-- CreateTable
CREATE TABLE "AthleteProfile" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "heightCm" DOUBLE PRECISION,
    "birthDate" TIMESTAMP(3),
    "sex" "Sex",
    "hrMaxBpm" INTEGER,
    "vo2max" DOUBLE PRECISION,
    "experience" "ExperienceLevel",
    "weeklyAvailabilityDays" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "period" "MissionPeriod" NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "target" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shoe" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "totalKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "alertKm" INTEGER,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shoe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Race" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "raceDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "distanceMeters" INTEGER,
    "targetTimeSeconds" INTEGER,
    "courseUrl" TEXT,
    "registrationUrl" TEXT,
    "status" "RaceStatus" NOT NULL DEFAULT 'interested',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Race_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AthleteProfile_studentId_key" ON "AthleteProfile"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteProgress_studentId_key" ON "AthleteProgress"("studentId");

-- CreateIndex
CREATE INDEX "Achievement_studentId_idx" ON "Achievement"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_studentId_code_key" ON "Achievement"("studentId", "code");

-- CreateIndex
CREATE INDEX "Mission_studentId_idx" ON "Mission"("studentId");

-- CreateIndex
CREATE INDEX "Shoe_studentId_idx" ON "Shoe"("studentId");

-- CreateIndex
CREATE INDEX "Race_studentId_idx" ON "Race"("studentId");

-- CreateIndex
CREATE INDEX "Race_raceDate_idx" ON "Race"("raceDate");

-- CreateIndex
CREATE INDEX "WorkoutLog_shoeId_idx" ON "WorkoutLog"("shoeId");

-- AddForeignKey
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_shoeId_fkey" FOREIGN KEY ("shoeId") REFERENCES "Shoe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteProfile" ADD CONSTRAINT "AthleteProfile_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteProgress" ADD CONSTRAINT "AthleteProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shoe" ADD CONSTRAINT "Shoe_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Race" ADD CONSTRAINT "Race_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
