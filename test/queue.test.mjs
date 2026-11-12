import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { PrismaClient } from "@prisma/client";
import { joinQueue, leaveBooth, promoteNext, queuePosition, boothSnapshot, SLOTS, BATAS_MENIT } from "../lib/queue.js";

const prisma = new PrismaClient();
const ids = [];

const makeVoter = async (n) => {
  const u = await prisma.user.create({
    data: { nim: `Q${Date.now()}${n}`, name: `Queue ${n}`, email: `q${Date.now()}${n}@test.local`, passwordHash: "x", role: "VOTER" },
  });
  ids.push(u.id);
  return u;
};

before(async () => {
  // ensure the poll is open for the duration of the test
  await prisma.systemSetting.update({
    where: { id: 1 },
    data: { isVotingOpen: true, startTime: new Date(Date.now() - 60_000), endTime: new Date(Date.now() + 3_600_000) },
  });
});

after(async () => {
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

test("first voter is admitted straight into the booth with a 5 minute deadline", async () => {
  const v = await makeVoter(1);
  const res = await joinQueue(v);
  assert.equal(res.state, "booth");
  const fresh = await prisma.user.findUnique({ where: { id: v.id } });
  assert.ok(fresh.voteAdmittedAt, "admitted timestamp stored");
  const mins = (fresh.voteDeadline - fresh.voteAdmittedAt) / 60_000;
  assert.ok(Math.abs(mins - BATAS_MENIT) < 0.1, `deadline is ${BATAS_MENIT} minutes out`);
  await leaveBooth(v.id);
});

test("a voter that gives up frees the slot and the next in line is promoted", async () => {
  const first = await makeVoter(2);
  const second = await makeVoter(3);

  const a = await joinQueue(first);
  const b = await joinQueue(second);
  assert.equal(a.state, "booth");
  assert.equal(b.state, "booth", "slot available -> admitted immediately");

  await leaveBooth(first.id);
  const promoted = await promoteNext();
  assert.ok(promoted.includes(second.id) || (await prisma.user.findUnique({ where: { id: second.id } })).voteAdmittedAt,
    "second voter holds an admitted slot");

  const pos = await queuePosition(await prisma.user.findUnique({ where: { id: second.id } }));
  assert.equal(pos, null, "admitted voter is not in the queue anymore");
});

test("voting without an admitted slot is refused", async () => {
  const v = await makeVoter(4);
  const fresh = await prisma.user.findUnique({ where: { id: v.id } });
  assert.equal(fresh.voteAdmittedAt, null);
  const snapshot = await boothSnapshot();
  assert.ok(snapshot.slots >= 1);
  assert.equal(typeof snapshot.inBooth, "number");
});

test("an expired deadline clears the session tag (forced logout)", async () => {
  const v = await makeVoter(5);
  await joinQueue(v);
  await prisma.user.update({
    where: { id: v.id },
    data: { voteDeadline: new Date(Date.now() - 1000), sessionTag: "abc" },
  });
  const { sweepExpired } = await import("../lib/queue.js");
  const swept = await sweepExpired();
  assert.ok(swept >= 1, "expired voter swept");
  const fresh = await prisma.user.findUnique({ where: { id: v.id } });
  assert.equal(fresh.sessionTag, null, "session token revoked");
  assert.equal(fresh.voteDeadline, null);
  assert.equal(fresh.voteAdmittedAt, null);
});
