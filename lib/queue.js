import { prisma } from "./db.js";
import { getSetting, votingOpen } from "./settings.js";

// Antrean bilik suara berbasis database (bukan in-memory), supaya restart proses
// atau VPS tidak menghapus posisi antrean.
//
// Aturan:
//   - paling banyak SLOTS pemilih boleh berada di bilik suara pada satu waktu;
//   - pemilih menunggu di antrean (FIFO menurut queueJoinedAt);
//   - pemilih yang masuk bilik mendapat BATAS_MENIT menit (voteDeadline);
//   - melewati batas -> dianggap logout, sesi diakhiri, slot dilepas.
export const SLOTS = Number(process.env.MAX_ACTIVE_VOTERS ?? 100);
export const BATAS_MENIT = 5;

const ms = (n) => n * 60_000;

/* ---------- pembersihan otomatis ---------- */

// Pemilih yang batas waktunya habis: kunci sesi (paksa login ulang) dan keluarkan
// dari bilik. Dijalankan lazy pada setiap request ringan — tidak perlu cron.
export async function sweepExpired() {
  const now = new Date();
  const expired = await prisma.user.findMany({
    where: { role: "VOTER", voteDeadline: { lt: now }, hasVoted: false },
    select: { id: true },
  });
  if (!expired.length) return 0;
  const ids = expired.map((u) => u.id);
  await prisma.user.updateMany({
    where: { id: { in: ids } },
    // sessionTag baru = token lama tidak valid lagi -> "logout" paksa
    data: { sessionTag: null, voteDeadline: null, voteAdmittedAt: null, queueJoinedAt: null },
  });
  return ids.length;
}

/* ---------- status ---------- */

export async function boothSnapshot() {
  await sweepExpired();
  const [inBooth, waiting] = await Promise.all([
    prisma.user.count({ where: { role: "VOTER", voteAdmittedAt: { not: null }, hasVoted: false } }),
    prisma.user.count({ where: { role: "VOTER", queueJoinedAt: { not: null }, voteAdmittedAt: null } }),
  ]);
  return { inBooth, waiting, slots: SLOTS };
}

// Posisi pemilih di antrean (1 = paling depan) + estimasi tunggu.
export async function queuePosition(user) {
  if (!user?.queueJoinedAt || user.voteAdmittedAt) return null;
  const ahead = await prisma.user.count({
    where: {
      role: "VOTER",
      hasVoted: false,
      voteAdmittedAt: null,
      queueJoinedAt: { lt: user.queueJoinedAt },
    },
  });
  return { position: ahead + 1, etaMinutes: Math.max(0, ahead * BATAS_MENIT) };
}

/* ---------- masuk antrean ---------- */

// Dipanggil saat pemilih membuka /milih. Mengembalikan status bilik untuk user ini.
export async function joinQueue(user) {
  const setting = await getSetting();
  if (!votingOpen(setting)) return { state: "closed" };
  if (user.hasVoted) return { state: "voted" };

  const now = new Date();
  const { inBooth } = await boothSnapshot();

  // sudah di bilik dan belum lewat batas -> lanjutkan
  if (user.voteAdmittedAt) {
    if (user.voteDeadline && user.voteDeadline > now) {
      return { state: "booth", deadline: user.voteDeadline };
    }
    // batas lewat (sweep mungkin belum menangkapnya pada request yang sama)
    await prisma.user.update({
      where: { id: user.id },
      data: { sessionTag: null, voteDeadline: null, voteAdmittedAt: null },
    });
    return { state: "expired" };
  }

  // sudah menunggu -> perbarui info antrean
  if (user.queueJoinedAt) {
    if (inBooth < SLOTS) {
      const admitted = await prisma.user.update({
        where: { id: user.id },
        data: { voteAdmittedAt: now, voteDeadline: new Date(now.getTime() + ms(BATAS_MENIT)) },
      });
      return { state: "booth", deadline: admitted.voteDeadline };
    }
    return { state: "waiting", ...(await queuePosition(user)), slots: SLOTS, inBooth };
  }

  // baru datang: langsung masuk kalau ada slot, kalau penuh masuk antrean
  if (inBooth < SLOTS) {
    const admitted = await prisma.user.update({
      where: { id: user.id },
      data: { queueJoinedAt: now, voteAdmittedAt: now, voteDeadline: new Date(now.getTime() + ms(BATAS_MENIT)) },
    });
    return { state: "booth", deadline: admitted.voteDeadline };
  }
  const queued = await prisma.user.update({ where: { id: user.id }, data: { queueJoinedAt: now } });
  return { state: "waiting", ...(await queuePosition(queued)), slots: SLOTS, inBooth };
}

/* ---------- keluar bilik ---------- */

export async function leaveBooth(userId, { expireSession = false } = {}) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      queueJoinedAt: null,
      voteAdmittedAt: null,
      voteDeadline: null,
      ...(expireSession ? { sessionTag: null } : {}),
    },
  });
}

// Pemilih berikutnya di antrean otomatis naik ketika ada slot kosong.
export async function promoteNext() {
  const { inBooth } = await boothSnapshot();
  const free = SLOTS - inBooth;
  if (free <= 0) return [];
  const next = await prisma.user.findMany({
    where: { role: "VOTER", hasVoted: false, queueJoinedAt: { not: null }, voteAdmittedAt: null },
    orderBy: { queueJoinedAt: "asc" },
    take: free,
    select: { id: true },
  });
  if (!next.length) return [];
  const now = new Date();
  const deadline = new Date(now.getTime() + ms(BATAS_MENIT));
  await prisma.user.updateMany({
    where: { id: { in: next.map((u) => u.id) } },
    data: { voteAdmittedAt: now, voteDeadline: deadline },
  });
  return next.map((u) => u.id);
}

// Sisa waktu dalam detik untuk pemilih di bilik.
export const remainingSeconds = (deadline) =>
  deadline ? Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000)) : 0;
