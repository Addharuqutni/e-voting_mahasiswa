// Satu module untuk status sesi pemilih. Tidak ada import Next.js di sini supaya
// bisa diuji dengan Node biasa. Semua aturan usia sesi tinggal di balik seam ini.
import { prisma } from "./db.js";

export const BOOTH_MINUTES = 5;
export const VOTE_GRACE_SECONDS = 60;

const clearBooth = {
  queueJoinedAt: null,
  voteAdmittedAt: null,
  voteDeadline: null,
};

// State + sisa waktu, dihitung dari satu baris User. `now` bisa diisi untuk tes.
export function sessionState(user, now = Date.now()) {
  if (!user) return { state: "anonymous", secondsLeft: 0 };
  if (user.role !== "VOTER") return { state: "admin", secondsLeft: 0 };
  if (user.hasVoted && user.votedAt) {
    const elapsed = (now - new Date(user.votedAt).getTime()) / 1000;
    return { state: "voted", secondsLeft: Math.max(0, Math.ceil(VOTE_GRACE_SECONDS - elapsed)) };
  }
  if (user.voteDeadline && new Date(user.voteDeadline).getTime() <= now) {
    return { state: "expired", secondsLeft: 0 };
  }
  if (user.voteAdmittedAt && user.voteDeadline) {
    return { state: "booth", secondsLeft: Math.max(0, Math.ceil((new Date(user.voteDeadline).getTime() - now) / 1000)) };
  }
  if (user.queueJoinedAt) return { state: "waiting", secondsLeft: 0 };
  return { state: "idle", secondsLeft: 0 };
}

// Cabut token sesi. Dipakai guard, sweep antrean, dan logout paksa.
export async function revokeSession(userId, { releaseBooth = true } = {}) {
  await prisma.user.update({
    where: { id: userId },
    data: { sessionTag: null, ...(releaseBooth ? clearBooth : {}) },
  });
}

export { clearBooth };
