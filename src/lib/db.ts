import { PrismaClient } from "@prisma/client";

/**
 * Bump when `prisma/schema.prisma` changes (reminder to run generate + full dev restart).
 * Note: after `prisma generate`, you must restart Node — HMR cannot reload `@prisma/client`.
 */
const PRISMA_CLIENT_GENERATION = 3;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaGeneration?: number;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/** Dev hot-reload can keep an old PrismaClient missing newly generated models/fields. */
function resolvePrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  const generationStale =
    globalForPrisma.prismaGeneration !== PRISMA_CLIENT_GENERATION;
  const modelStale = cached && !("boardEntryLog" in cached);

  if (
    cached &&
    process.env.NODE_ENV !== "production" &&
    (generationStale || modelStale)
  ) {
    void cached.$disconnect().catch(() => {});
    const fresh = createPrismaClient();
    globalForPrisma.prisma = fresh;
    globalForPrisma.prismaGeneration = PRISMA_CLIENT_GENERATION;
    return fresh;
  }
  if (cached) return cached;
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaGeneration = PRISMA_CLIENT_GENERATION;
  }
  return client;
}

export const prisma = resolvePrismaClient();

export const ENTRY_LOGS_NOT_READY_MESSAGE =
  "Entry logs need a database update. Run: npx prisma db push && npx prisma generate — then restart the app (npm run dev:clean).";

export function boardEntryLogOrThrow() {
  const delegate = (
    prisma as PrismaClient & { boardEntryLog?: PrismaClient["boardEntryLog"] }
  ).boardEntryLog;
  if (!delegate) {
    throw new Error(ENTRY_LOGS_NOT_READY_MESSAGE);
  }
  return delegate;
}

export default prisma;
