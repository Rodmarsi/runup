import { prisma } from "@runup/db";

/** Limpa as tabelas na ordem correta de FK, para isolar cada teste. */
export async function resetDb() {
  await prisma.workoutComment.deleteMany();
  await prisma.workoutLog.deleteMany();
  await prisma.workoutDay.deleteMany();
  await prisma.planAssignment.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.message.deleteMany();
  await prisma.bodyMetric.deleteMany();
  await prisma.personalRecord.deleteMany();
  await prisma.stravaConnection.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.coachStudent.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.athleteProfile.deleteMany();
  await prisma.athleteProgress.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.mission.deleteMany();
  await prisma.shoe.deleteMany();
  await prisma.race.deleteMany();
  await prisma.pushToken.deleteMany();
  await prisma.user.deleteMany();
}
