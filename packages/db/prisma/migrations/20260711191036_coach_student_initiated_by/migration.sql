-- CreateEnum
CREATE TYPE "InvitedBy" AS ENUM ('coach', 'student');

-- AlterTable
ALTER TABLE "CoachStudent" ADD COLUMN     "initiatedBy" "InvitedBy" NOT NULL DEFAULT 'coach';
