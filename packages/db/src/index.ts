import { PrismaClient } from "@prisma/client";

export * from "@prisma/client";

/** Cliente Prisma singleton (reusa a instância em dev/hot-reload). */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
