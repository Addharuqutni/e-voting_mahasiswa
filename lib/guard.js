import { redirect } from "next/navigation";
import { auth } from "./auth.js";
import { prisma } from "./db.js";
import { getSetting, votingOpen } from "./settings.js";

const expired = (user) =>
  user.role === "VOTER" && Boolean(user.voteDeadline) && user.voteDeadline <= new Date();

// Setelah memilih, sesi pemilih hanya boleh bertahan 1 menit (bilik dipakai bersama).
export const LOGOUT_AFTER_VOTE_SECONDS = 60;
export const votedTooLong = (user) =>
  user?.role === "VOTER" &&
  user.hasVoted &&
  Boolean(user.votedAt) &&
  Date.now() - new Date(user.votedAt).getTime() > LOGOUT_AFTER_VOTE_SECONDS * 1000;

// Sesi dicabut (sessionTag = null) sehingga token lama tidak berlaku lagi.
async function expire(user) {
  await prisma.user.update({
    where: { id: user.id },
    data: { sessionTag: null, voteDeadline: null, voteAdmittedAt: null, queueJoinedAt: null },
  });
}

async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: Number(session.user.id) } });
  return user && user.sessionTag === session.user.tag ? user : null;
}

export async function getSessionUser() {
  const user = await currentUser();
  if (!user) return null;
  // Batas 5 menit di bilik suara: sessionTag dicabut saat lewat.
  if (expired(user) || votedTooLong(user)) {
    await expire(user);
    return null;
  }
  return user;
}

export async function requireUser(role) {
  const user = await currentUser();
  if (!user) redirect("/");
  if (expired(user)) {
    await expire(user);
    redirect("/waktu-habis");
  }
  if (votedTooLong(user)) {
    await expire(user);
    redirect("/selesai");
  }
  if (role && user.role !== role) redirect(user.role === "ADMIN" ? "/dashboard" : "/milih");
  return user;
}

export { getSetting, votingOpen };
