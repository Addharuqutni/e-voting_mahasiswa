// Format non-Jadwal. Aturan rentang/waktu Jadwal ada di lib/jadwal.js.
const dtf = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
export const fmtDT = (v) => (v && !Number.isNaN(new Date(v).getTime()) ? dtf.format(new Date(v)) : "—");
export const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
