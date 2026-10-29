
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDatabaseUrl(): string | undefined {
  if (process.env.NODE_ENV === "test") {
    if (process.env.DATABASE_URL_TEST) {
      return process.env.DATABASE_URL_TEST;
    }
    const defaultUrl = process.env.DATABASE_URL;
    if (defaultUrl) {
      return defaultUrl.replace(/\/prisms(\?|$)/, "/prisms_test$1");
    }
  }
  return process.env.DATABASE_URL;
}

const activeDbUrl = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    activeDbUrl
      ? {
          datasources: {
            db: {
              url: activeDbUrl,
            },
          },
        }
      : undefined,
  );

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}