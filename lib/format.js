const dtf = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
export const fmtDT = (v) => (v && !Number.isNaN(new Date(v).getTime()) ? dtf.format(new Date(v)) : "—");
export const nn = (n) => String(n).padStart(2, "0");
// <input type="datetime-local"> is local wall-clock time, so never format through toISOString() (UTC).
export const toLocalInput = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${nn(d.getMonth() + 1)}-${nn(d.getDate())}T${nn(d.getHours())}:${nn(d.getMinutes())}`;
};
const dtDay = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
const dtTime = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" });
// "11 Nov 2026, 08.00 – 23.59" when both ends share a day.
export const fmtRange = (a, b) => {
  if (!a || !b) return "—";
  const s = new Date(a), e = new Date(b);
  return s.toDateString() === e.toDateString()
    ? `${dtDay.format(s)}, ${dtTime.format(s)} – ${dtTime.format(e)}`
    : `${dtDay.format(s)} ${dtTime.format(s)} – ${dtDay.format(e)} ${dtTime.format(e)}`;
};
export const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
