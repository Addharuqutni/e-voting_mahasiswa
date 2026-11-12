import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { PrismaClient } from "@prisma/client";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { enter, vote, leave, snapshot, state, sessionState, BOOTH_MINUTES, VOTE_GRACE_SECONDS } from "../lib/booth.js";

const prisma = new PrismaClient();
const ids = [];
let candidateId;

const makeVoter = async (n) => {
  const u = await prisma.user.create({
    data: { nim: `B${Date.now()}${n}`, name: `Bilik ${n}`, email: `b${Date.now()}${n}@test.local`, passwordHash: "x", role: "VOTER" },
  });
  ids.push(u.id);
  return u;
};

before(async () => {
  await prisma.systemSetting.update({
    where: { id: 1 },
    data: { isVotingOpen: true, startTime: new Date(Date.now() - 60_000), endTime: new Date(Date.now() + 3_600_000) },
  });
  const c = await prisma.candidate.create({
    data: { electionNumber: 800 + (Date.now() % 90), leaderName: "A", viceName: "B", vision: "v", mission: "m" },
  });
  candidateId = c.id;
});

after(async () => {
  await prisma.vote.deleteMany({ where: { candidateId } });
  await prisma.candidate.delete({ where: { id: candidateId } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

test("password hash verifies and rejects wrong password", async () => {
  const h = await hashPassword("rahasia123");
  assert.equal(await verifyPassword("rahasia123", h), true);
  assert.equal(await verifyPassword("rahasia124", h), false);
  assert.equal(await verifyPassword("x", "garbage"), false);
});

test("sessionState: booth, expired, voted, and grace are one interface", () => {
  const now = Date.now();
  assert.equal(sessionState(null).state, "anonymous");
  assert.equal(sessionState({ role: "ADMIN" }).state, "admin");
  assert.equal(sessionState({ role: "VOTER", voteAdmittedAt: now, voteDeadline: now + 60_000 }, now).state, "booth");
  assert.equal(sessionState({ role: "VOTER", voteDeadline: now - 1 }, now).state, "expired");
  const voted = sessionState({ role: "VOTER", hasVoted: true, votedAt: now - 10_000 }, now);
  assert.equal(voted.state, "voted");
  assert.equal(voted.secondsLeft, VOTE_GRACE_SECONDS - 10);
  assert.equal(sessionState({ role: "VOTER", hasVoted: true, votedAt: now - 61_000 }, now).secondsLeft, 0);
});

test("enter admits a voter; vote writes one secret ballot and releases the slot", async () => {
  const v = await makeVoter(1);
  const entered = await enter(v);
  assert.equal(entered.state, "booth");

  const settled = await Promise.allSettled([vote(await prisma.user.findUnique({ where: { id: v.id } }), candidateId),
                                           vote(await prisma.user.findUnique({ where: { id: v.id } }), candidateId)]);
  assert.equal(settled.filter(r => r.status === "fulfilled" && r.value.ok).length, 1, "exactly one vote wins");
  assert.equal(await prisma.vote.count({ where: { candidateId } }), 1);

  const fresh = await prisma.user.findUnique({ where: { id: v.id } });
  assert.equal(fresh.hasVoted, true);
  assert.equal(fresh.voteAdmittedAt, null, "slot released by vote()");
  assert.equal((await state(fresh)).state, "voted");
  assert.equal((await state(fresh)).secondsLeft > 0, true);
  await leave(v.id, { promote: false });
});

test("leave revokes and promotes through one call", async () => {
  const v = await makeVoter(2);
  await prisma.user.update({ where: { id: v.id }, data: { sessionTag: "abc" } });
  await leave(v.id, { revoke: true });
  const fresh = await prisma.user.findUnique({ where: { id: v.id } });
  assert.equal(fresh.sessionTag, null);
  assert.equal(fresh.voteDeadline, null);
});

test("snapshot reports booth occupancy", async () => {
  const snap = await snapshot();
  assert.ok(snap.slots >= 1);
  assert.equal(typeof snap.inBooth, "number");
  assert.equal(typeof snap.waiting, "number");
});

test("ballot row carries no link back to the voter", async () => {
  const columns = process.env.DATABASE_URL?.startsWith("file:")
    ? await prisma.$queryRawUnsafe("PRAGMA table_info('Vote')")
    : await prisma.$queryRawUnsafe("select column_name from information_schema.columns where table_name = 'Vote'");
  assert.deepEqual(columns.map(c => c.name ?? c.column_name).sort(), ["candidateId", "createdAt", "id"]);
});

test("BOOTH_MINUTES stays the single source for the deadline", async () => {
  const v = await makeVoter(3);
  await enter(v);
  const fresh = await prisma.user.findUnique({ where: { id: v.id } });
  assert.ok(Math.abs((fresh.voteDeadline - fresh.voteAdmittedAt) / 60_000 - BOOTH_MINUTES) < 0.1);
  await leave(v.id, { promote: false });
});
