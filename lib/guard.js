import { redirect } from "next/navigation";
import { auth } from "./auth.js";
import { prisma } from "./db.js";
import { getSetting, votingOpen } from "./settings.js";
import { revokeSession, sessionState } from "./session.js";

// guard.js cuma menjembatani auth() NextAuth ke module sesi; aturan usia sesi
// ada di lib/session.js, bukan di sini lagi.
async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: Number(session.user.id) } });
  return user && user.sessionTag === session.user.tag ? user : null;
}

export async function getSessionUser() {
  const user = await currentUser();
  if (!user) return null;
  const status = sessionState(user);
  if (status.state === "expired" || (status.state === "voted" && status.secondsLeft === 0)) {
    await revokeSession(user.id);
    return null;
  }
  return user;
}

export async function requireUser(role) {
  const user = await currentUser();
  if (!user) redirect("/");
  const status = sessionState(user);
  if (status.state === "expired") {
    await revokeSession(user.id);
    redirect("/waktu-habis");
  }
  if (status.state === "voted" && status.secondsLeft === 0) {
    await revokeSession(user.id);
    redirect("/selesai");
  }
  if (role && user.role !== role) redirect(user.role === "ADMIN" ? "/dashboard" : "/milih");
  return user;
}

export { getSetting, votingOpen };
