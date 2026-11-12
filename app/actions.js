"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { getSessionUser, requireUser } from "@/lib/guard";
import { enter, leave, vote } from "@/lib/booth.js";
import { rateLimit, resetLimit } from "@/lib/rateLimit";

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "unknown").trim();
}

export async function loginAction(prev, formData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email/NIM dan password wajib diisi." };

  // Brute-force guard: per IP and per account. Messages stay generic so the
  // form never reveals whether an account exists.
  const ip = await clientIp();
  // Batas per-IP sengaja longgar: banyak mahasiswa berada di satu IP (NAT kampus).
  // Batas ketat ada di level akun (mencegah brute force satu akun).
  const perIp = rateLimit(`login:ip:${ip}`, { limit: Number(process.env.LOGIN_LIMIT_PER_IP ?? 200), windowMs: 15 * 60_000 });
  const perAccount = rateLimit(`login:acct:${email}`, { limit: Number(process.env.LOGIN_LIMIT_PER_ACCOUNT ?? 8), windowMs: 5 * 60_000 });
  if (!perIp.ok || !perAccount.ok) {
    const wait = Math.max(perIp.retryAfter, perAccount.retryAfter);
    return { error: `Terlalu banyak percobaan masuk. Coba lagi dalam ${Math.ceil(wait / 60)} menit.` };
  }
  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Periksa kembali email/NIM dan password Anda." };
    throw e;
  }
  const user = await prisma.user.findFirst({ where: { OR: [{ email }, { nim: email }] } });
  resetLimit(`login:acct:${email}`);
  // Pemilih masuk antrean saat /milih dibuka (lihat lib/booth.js enter).
  if (user?.role === "VOTER") await leave(user.id, { promote: false });
  redirect(user?.role === "ADMIN" ? "/dashboard" : "/milih");
}

export async function logoutAction() {
  const user = await getSessionUser();
  if (user) await leave(user.id);
  await signOut({ redirectTo: "/" });
}

// Timer bilik habis: satu panggilan melepas slot, mencabut sesi, memajukan antrean.
export async function voteTimeoutAction() {
  const user = await getSessionUser();
  if (user) await leave(user.id, { revoke: true });
  await signOut({ redirectTo: "/waktu-habis" });
}

export async function castVoteAction(candidateId) {
  const user = await getSessionUser();
  if (!user) return { error: "Sesi berakhir. Silakan masuk ulang." };
  const result = await vote(user, candidateId);
  if (result.error) return { error: result.error };
  // Sesi sengaja dibiarkan hidup 1 menit (lihat lib/session.js) lalu logout otomatis.
  redirect("/selesai");
}

/* ---------- admin ---------- */

export async function saveCandidate(formData) {
  await requireUser("ADMIN");
  const id = Number(formData.get("id") || 0);
  const data = {
    electionNumber: Number(formData.get("electionNumber")),
    leaderName: String(formData.get("leaderName") ?? "").trim(),
    viceName: String(formData.get("viceName") ?? "").trim(),
    vision: String(formData.get("vision") ?? "").trim(),
    mission: String(formData.get("mission") ?? "").trim(),
    instagram: String(formData.get("instagram") ?? "").trim() || null,
    photoUrl: String(formData.get("photoUrl") ?? "").trim() || null,
    cvUrl: String(formData.get("cvUrl") ?? "").trim() || null,
  };
  if (!data.leaderName || !data.viceName || !Number.isInteger(data.electionNumber) || data.electionNumber < 1) {
    return { error: "Nomor urut, nama ketua, dan wakil wajib diisi." };
  }
  try {
    if (id) await prisma.candidate.update({ where: { id }, data });
    else await prisma.candidate.create({ data });
  } catch (e) {
    return { error: e.code === "P2002" ? "Nomor urut sudah dipakai paslon lain." : "Gagal menyimpan data paslon." };
  }
  revalidatePath("/dashboard/kandidat");
  return { ok: id ? "Data paslon diperbarui." : "Paslon ditambahkan." };
}

export async function deleteCandidate(formData) {
  await requireUser("ADMIN");
  const id = Number(formData.get("id"));
  // Ballots have no user link, so they are not deleted with the candidate — refuse instead of losing votes.
  if (await prisma.vote.count({ where: { candidateId: id } })) return { error: "Paslon sudah punya suara, tidak bisa dihapus." };
  await prisma.candidate.delete({ where: { id } });
  revalidatePath("/dashboard/kandidat");
}

export async function saveUser(formData) {
  await requireUser("ADMIN");
  const id = Number(formData.get("id") || 0);
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "VOTER";
  const password = String(formData.get("password") ?? "");
  const data = {
    name: String(formData.get("name") ?? "").trim(),
    nim: String(formData.get("nim") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    role,
  };
  if (!data.name || !data.email) return { error: "Nama dan email wajib diisi." };
  if ((!id || password) && password.length < 8) return { error: "Password minimal 8 karakter." };
  if (password) data.passwordHash = await hashPassword(password);
  try {
    if (id) await prisma.user.update({ where: { id }, data });
    else await prisma.user.create({ data });
  } catch (e) {
    return { error: e.code === "P2002" ? "Email atau NIM sudah dipakai." : "Gagal menyimpan data." };
  }
  revalidatePath("/dashboard/pemilih");
  revalidatePath("/dashboard/admin");
  return { ok: "Data tersimpan." };
}

export async function deleteUser(formData) {
  const me = await requireUser("ADMIN");
  const id = Number(formData.get("id"));
  if (id === me.id) return { error: "Tidak bisa menghapus akun sendiri." };
  await prisma.user.delete({ where: { id } });
  revalidatePath("/dashboard/pemilih");
  revalidatePath("/dashboard/admin");
}

export async function importVotersCsv(formData) {
  await requireUser("ADMIN");
  const file = formData.get("file");
  if (!file || typeof file === "string") return { error: "File CSV tidak ditemukan." };
  const text = (await file.text()).replace(/^\uFEFF/, "");
  const rows = text.split(/\r?\n/).filter((l) => l.trim());
  if (!rows.length) return { error: "CSV kosong." };
  const header = rows[0].toLowerCase();
  const body = header.includes("nama") || header.includes("name") ? rows.slice(1) : rows;
  const created = [];
  for (const line of body) {
    const [nim, name, email, password] = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    if (!nim || !name || !email || !password) continue;
    created.push({ nim, name, email: email.toLowerCase(), passwordHash: await hashPassword(password) });
  }
  if (!created.length) return { error: "Tidak ada baris valid. Format: NIM,Nama,Email,Password" };
  // One insert per row: works on both PostgreSQL and SQLite (SQLite has no createMany).
  let imported = 0, skipped = 0;
  for (const row of created) {
    try {
      await prisma.user.create({ data: row });
      imported += 1;
    } catch {
      skipped += 1; // NIM/email sudah dipakai
    }
  }
  revalidatePath("/dashboard/pemilih");
  return { ok: `${imported} pemilih diimpor, ${skipped} dilewati (duplikat).` };
}

export async function saveSchedule(formData) {
  await requireUser("ADMIN");
  const start = String(formData.get("startTime") ?? "");
  const end = String(formData.get("endTime") ?? "");
  const announce = String(formData.get("announceAt") ?? "");
  const startAt = start ? new Date(start) : null, endAt = end ? new Date(end) : null;
  if ((startAt && Number.isNaN(startAt.getTime())) || (endAt && Number.isNaN(endAt.getTime()))) return { error: "Format tanggal tidak valid." };
  if (startAt && endAt && startAt >= endAt) return { error: "Waktu selesai harus setelah waktu mulai." };
  await prisma.systemSetting.upsert({
    where: { id: 1 },
    create: { id: 1, isVotingOpen: true, startTime: startAt, endTime: endAt, announceAt: announce ? new Date(announce) : null },
    update: { startTime: startAt, endTime: endAt, announceAt: announce ? new Date(announce) : null },
  });
  revalidatePath("/dashboard/jadwal");
  revalidatePath("/milih");
  return { ok: "Jadwal disimpan." };
}

export async function toggleVoting() {
  await requireUser("ADMIN");
  const setting = await prisma.systemSetting.findUnique({ where: { id: 1 } });
  await prisma.systemSetting.upsert({
    where: { id: 1 },
    create: { id: 1, isVotingOpen: true },
    update: { isVotingOpen: !setting?.isVotingOpen },
  });
  revalidatePath("/dashboard/jadwal");
  revalidatePath("/milih");
  revalidatePath("/hasil");
  return { ok: setting?.isVotingOpen ? "Pemungutan suara ditutup." : "Pemungutan suara dibuka." };
}
