import { prisma } from "@runup/db";

/** Limpa as tabelas na ordem correta de FK, para isolar cada teste. */
export async function resetDb() {
  await prisma.subscription.deleteMany();
  await prisma.coachStudent.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}
