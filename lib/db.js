import { PrismaClient } from "@prisma/client";

// ponytail: single process / dev reload guard; a pooled client is enough here.
// The default database is a SQLite file (see prisma/schema.prisma); the
// PostgreSQL variant lives in prisma/schema.postgres.prisma.
export const prisma = globalThis.__prisma ?? (globalThis.__prisma = new PrismaClient());

// SQLite tuning (persistent per database file, applied once per process):
//   WAL  -> readers are not blocked while a vote is being written
//   FULL -> the last committed vote survives a power cut (WAL default is NORMAL)
//   foreign_keys -> enforce the Vote -> Candidate relation in the database
if (process.env.DATABASE_URL?.startsWith("file:")) {
  try {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL");
    await prisma.$queryRawUnsafe("PRAGMA synchronous = FULL");
    await prisma.$queryRawUnsafe("PRAGMA foreign_keys = ON");
    // batasi file WAL supaya tidak membengkak di VPS
    await prisma.$queryRawUnsafe("PRAGMA journal_size_limit = 67108864");
    // cache & mmap lebih besar -> query lebih cepat di RAM, tetap durable (synchronous=FULL)
    await prisma.$queryRawUnsafe("PRAGMA cache_size = -65536");
    await prisma.$queryRawUnsafe("PRAGMA mmap_size = 268435456");
    await prisma.$queryRawUnsafe("PRAGMA temp_store = MEMORY");
  } catch (e) {
    console.warn("sqlite pragma setup failed:", e?.message ?? e);
  }
}

// Drain the pool on shutdown so the VPS can restart without "too many clients".
if (process.env.NODE_ENV === "production" && !globalThis.__prismaShutdownHooked) {
  globalThis.__prismaShutdownHooked = true;
  const shutdown = async () => {
    await prisma.$disconnect().catch(() => {});
    process.exit(0);
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
