// Modul bilik suara: antrean FIFO, batas giliran, dan penulisan suara rahasia.
// Interface kecil: enter / vote / leave / snapshot / state. Semua urutan, retry,
// kompensasi, dan promosi antrean ada di implementation, bukan di pemanggil.
import { prisma } from "./db.js";
import { getSetting, votingOpen } from "./settings.js";
import { BOOTH_MINUTES, VOTE_GRACE_SECONDS, clearBooth, revokeSession, sessionState } from "./session.js";

export const SLOTS = Number(process.env.MAX_ACTIVE_VOTERS ?? 100);
const ms = (n) => n * 60_000;

const isBusy = (e) => {
  const code = e?.code ?? "";
  return code === "P1008" || code === "P2034" || /database is locked|busy|timeout/i.test(String(e?.message ?? ""));
};
async function withRetry(fn, attempts = 4) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (e) {
      last = e;
      if (!isBusy(e)) throw e;
      await new Promise((r) => setTimeout(r, 40 * (i + 1)));
    }
  }
  throw last;
}

// Bersihkan pemilih yang kehabisan waktu (lazy, setiap request ringan).
async function sweepExpired() {
  const now = new Date();
  const dead = await prisma.user.findMany({
    where: { role: "VOTER", voteDeadline: { lt: now }, hasVoted: false },
    select: { id: true },
  });
  if (!dead.length) return 0;
  const ids = dead.map((u) => u.id);
  await prisma.user.updateMany({ where: { id: { in: ids } }, data: { sessionTag: null, ...clearBooth } });
  return ids.length;
}

async function promote() {
  const { inBooth } = await snapshot();
  const free = SLOTS - inBooth;
  if (free <= 0) return;
  const next = await prisma.user.findMany({
    where: { role: "VOTER", hasVoted: false, queueJoinedAt: { not: null }, voteAdmittedAt: null },
    orderBy: { queueJoinedAt: "asc" }, take: free, select: { id: true },
  });
  if (!next.length) return;
  const now = new Date();
  await prisma.user.updateMany({
    where: { id: { in: next.map((u) => u.id) } },
    data: { voteAdmittedAt: now, voteDeadline: new Date(now.getTime() + ms(BOOTH_MINUTES)) },
  });
}

async function queueInfo(user) {
  const ahead = await prisma.user.count({
    where: { role: "VOTER", hasVoted: false, voteAdmittedAt: null, queueJoinedAt: { lt: user.queueJoinedAt } },
  });
  return { position: ahead + 1, etaMinutes: ahead * BOOTH_MINUTES };
}

export async function snapshot() {
  await sweepExpired();
  const [inBooth, waiting] = await Promise.all([
    prisma.user.count({ where: { role: "VOTER", voteAdmittedAt: { not: null }, hasVoted: false } }),
    prisma.user.count({ where: { role: "VOTER", queueJoinedAt: { not: null }, voteAdmittedAt: null } }),
  ]);
  return { inBooth, waiting, slots: SLOTS };
}

export async function state(user) {
  return sessionState(user);
}

// Satu panggilan untuk membuka /milih: cek jadwal, status, antrean, dan slot.
export async function enter(user) {
  if (!votingOpen(await getSetting())) return { state: "closed", secondsLeft: 0 };
  const status = sessionState(user);
  if (status.state === "voted") return status;
  if (status.state === "expired") {
    await revokeSession(user.id);
    await promote();
    return status;
  }
  const now = new Date();
  const booth = await snapshot();
  if (status.state === "booth") return status;
  if (status.state === "idle" || status.state === "waiting") {
    if (booth.inBooth >= SLOTS) {
      const queued = status.state === "idle"
        ? await prisma.user.update({ where: { id: user.id }, data: { queueJoinedAt: now } })
        : user;
      return { state: "waiting", secondsLeft: 0, ...(await queueInfo(queued)), slots: SLOTS, inBooth: booth.inBooth };
    }
    const admitted = await prisma.user.update({
      where: { id: user.id },
      data: { queueJoinedAt: now, voteAdmittedAt: now, voteDeadline: new Date(now.getTime() + ms(BOOTH_MINUTES)) },
    });
    return { state: "booth", secondsLeft: BOOTH_MINUTES * 60, deadline: admitted.voteDeadline };
  }
  return status;
}

// Satu panggilan untuk seluruh alur kirim suara: validasi, klaim atomik,
// kompensasi, lepas slot, promosi antrean. Rahasia suara tetap terjaga.
export async function vote(user, candidateId) {
  const status = sessionState(user);
  if (!votingOpen(await getSetting())) return { error: "Pemungutan suara sudah ditutup." };
  if (status.state === "voted") return { error: "Suara Anda sudah tercatat." };
  if (status.state !== "booth") return { error: "Giliran Anda belum tiba. Tetap di halaman antrean." };

  const id = Number(candidateId);
  if (!Number.isInteger(id)) return { error: "Paslon tidak ditemukan." };
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) return { error: "Paslon tidak ditemukan." };

  const claimed = await withRetry(() => prisma.user.updateMany({
    where: { id: user.id, hasVoted: false },
    data: { hasVoted: true, votedAt: new Date() },
  }));
  if (claimed.count !== 1) return { error: "Suara Anda sudah tercatat." };
  try {
    await withRetry(() => prisma.vote.create({ data: { candidateId: id } }));
  } catch {
    await prisma.user.updateMany({
      where: { id: user.id, hasVoted: true },
      data: { hasVoted: false, votedAt: null },
    }).catch(() => {});
    return { error: "Gagal menyimpan suara, coba lagi." };
  }
  await leave(user.id, { promote: true });
  return { ok: true, secondsLeft: VOTE_GRACE_SECONDS };
}

// Satu panggilan untuk keluar: lepas slot, cabut sesi bila perlu, majukan antrean.
export async function leave(userId, { revoke = false, promote: doPromote = true } = {}) {
  await prisma.user.update({ where: { id: userId }, data: clearBooth });
  if (revoke) await revokeSession(userId, { releaseBooth: false });
  if (doPromote) await promote();
}

export { BOOTH_MINUTES, VOTE_GRACE_SECONDS, sessionState };
