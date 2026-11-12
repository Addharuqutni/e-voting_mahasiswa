import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { PrismaClient } from "@prisma/client";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { castVote } from "../lib/vote.js";

const prisma = new PrismaClient();
let userId, candidateId;

before(async () => {
  const user = await prisma.user.create({
    data: { nim: `T${Date.now()}`, name: "Test Voter", email: `t${Date.now()}@test.local`, passwordHash: await hashPassword("password123") },
  });
  userId = user.id;
  const cand = await prisma.candidate.create({
    data: { electionNumber: 900 + (Date.now() % 90), leaderName: "A", viceName: "B", vision: "v", mission: "m" },
  });
  candidateId = cand.id;
});

after(async () => {
  await prisma.vote.deleteMany({ where: { candidateId } });
  await prisma.candidate.delete({ where: { id: candidateId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

// memakai jalur tulis yang sama dengan aplikasi (lib/vote.js)
const cast = () => castVote({ userId, candidateId }).then((r) => { if (r.error) throw new Error(r.error); return r; });

test("password hash verifies and rejects wrong password", async () => {
  const h = await hashPassword("rahasia123");
  assert.equal(await verifyPassword("rahasia123", h), true);
  assert.equal(await verifyPassword("rahasia124", h), false);
  assert.equal(await verifyPassword("x", "garbage"), false);
});

test("one vote per voter: concurrent double submit records exactly one ballot", async () => {
  const settled = await Promise.allSettled([cast(), cast(), cast()]);
  const ok = settled.filter((r) => r.status === "fulfilled").length;
  const ballots = await prisma.vote.count({ where: { candidateId } });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  assert.equal(ok, 1, "exactly one submit wins");
  assert.equal(ballots, 1, "exactly one ballot stored");
  assert.equal(user.hasVoted, true);
});

test("ballot row carries no link back to the voter (secret ballot)", async () => {
  // column list, portable across SQLite and PostgreSQL
  const columns = process.env.DATABASE_URL?.startsWith("file:")
    ? await prisma.$queryRawUnsafe("PRAGMA table_info('Vote')")
    : await prisma.$queryRawUnsafe(
        `select column_name from information_schema.columns where table_name = 'Vote'`
      );
  const names = columns.map((c) => c.name ?? c.column_name);
  assert.deepEqual(names.sort(), ["candidateId", "createdAt", "id"]);
});
