// Modul Jadwal: baca, cek jendela, validasi, format, dan mutasi SystemSetting.
// Satu interface kecil; aturan waktu & label WIB tidak boleh bocor ke halaman.
import { prisma } from "./db.js";

const dtf = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const dtDay = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
const dtTime = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" });
const nn = (n) => String(n).padStart(2, "0");
const date = (v) => (v == null || v === "" ? null : new Date(v));
const valid = (d) => d && !Number.isNaN(d.getTime());

// Format tampilan untuk satu tanggal Jadwal.
export const label = (v) => (valid(date(v)) ? dtf.format(date(v)) : "—");

// <input type="datetime-local"> memakai jam dinding, jangan lewat toISOString().
export const localInput = (v) => {
  const d = date(v);
  if (!valid(d)) return "";
  return `${d.getFullYear()}-${nn(d.getMonth() + 1)}-${nn(d.getDate())}T${nn(d.getHours())}:${nn(d.getMinutes())}`;
};

// Rentang pemungutan; dua tanggal sama hari dirapatkan jadi satu baris.
export const rangeLabel = (a, b) => {
  const s = date(a), e = date(b);
  if (!valid(s) || !valid(e)) return "—";
  return s.toDateString() === e.toDateString()
    ? `${dtDay.format(s)}, ${dtTime.format(s)} – ${dtTime.format(e)}`
    : `${dtDay.format(s)} ${dtTime.format(s)} – ${dtDay.format(e)} ${dtTime.format(e)}`;
};

// Perilaku Jadwal dihitung dari satu baris setting + waktu yang bisa diinjeksi (tes).
export function describe(setting, now = new Date()) {
  const start = date(setting?.startTime), end = date(setting?.endTime), announce = date(setting?.announceAt);
  const open = Boolean(setting?.isVotingOpen && (!start || start <= now) && (!end || end >= now));
  const announced = announce ? announce <= now : !open;
  return {
    open,
    announced,
    resultsVisible: !open && announced,
    start: setting?.startTime ?? null,
    end: setting?.endTime ?? null,
    announce: setting?.announceAt ?? null,
    startLabel: label(start), endLabel: label(end), announceLabel: label(announce),
    rangeLabel: rangeLabel(start, end),
    startInput: localInput(start), endInput: localInput(end), announceInput: localInput(announce),
  };
}

// Baca Jadwal: satu panggilan, hasil sudah siap dipakai halaman maupun Bilik suara.
export async function current(now = new Date()) {
  return describe(await prisma.systemSetting.findUnique({ where: { id: 1 } }), now);
}

// Cek cepat untuk Bilik suara tanpa perlu tahu struktur SystemSetting.
export async function isOpen(now = new Date()) {
  return (await current(now)).open;
}

// Validasi input form Jadwal. Mengembalikan { error } atau { data } siap disimpan.
export function parseInput(formData) {
  const raw = {
    start: String(formData.get("startTime") ?? ""),
    end: String(formData.get("endTime") ?? ""),
    announce: String(formData.get("announceAt") ?? ""),
  };
  const startAt = date(raw.start), endAt = date(raw.end), announceAt = date(raw.announce);
  if ((raw.start && !valid(startAt)) || (raw.end && !valid(endAt)) || (raw.announce && !valid(announceAt))) {
    return { error: "Format tanggal tidak valid." };
  }
  if (startAt && endAt && startAt >= endAt) return { error: "Waktu selesai harus setelah waktu mulai." };
  return { data: { startTime: startAt, endTime: endAt, announceAt } };
}

// Mutasi Jadwal lewat satu interface; tanggal sudah tervalidasi.
export async function update(formData) {
  const parsed = parseInput(formData);
  if (parsed.error) return parsed;
  await prisma.systemSetting.upsert({
    where: { id: 1 },
    create: { id: 1, isVotingOpen: true, ...parsed.data },
    update: parsed.data,
  });
  return { ok: "Jadwal disimpan." };
}

// Buka/tutup pemungutan; pesan hasil ditentukan modul, bukan action.
export async function toggle() {
  const setting = await prisma.systemSetting.findUnique({ where: { id: 1 } });
  await prisma.systemSetting.upsert({
    where: { id: 1 },
    create: { id: 1, isVotingOpen: true },
    update: { isVotingOpen: !setting?.isVotingOpen },
  });
  return { ok: setting?.isVotingOpen ? "Pemungutan suara ditutup." : "Pemungutan suara dibuka." };
}
