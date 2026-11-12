import assert from "node:assert/strict";
import { test } from "node:test";
import { describe, label, localInput, parseInput, rangeLabel } from "../lib/jadwal.js";

const at = (h, m = 0) => new Date(2026, 10, 12, h, m);
const fd = (o) => ({ get: (k) => o[k] ?? null });

// Interface Jadwal diuji tanpa Next.js: state, label, input, dan validasi.
test("describe: open, announced, resultsVisible from one Jadwal row", () => {
  const setting = { isVotingOpen: true, startTime: at(8), endTime: at(17), announceAt: at(18) };
  assert.deepEqual(
    (({ open, announced, resultsVisible }) => ({ open, announced, resultsVisible }))(describe(setting, at(10))),
    { open: true, announced: false, resultsVisible: false }
  );
  const after = describe(setting, at(19));
  assert.equal(after.open, false);
  assert.equal(after.announced, true);
  assert.equal(after.resultsVisible, true);
  assert.equal(describe({ ...setting, isVotingOpen: false }, at(10)).open, false);
});

test("describe: no announceAt falls back to 'after poll closes'", () => {
  const setting = { isVotingOpen: true, startTime: at(8), endTime: at(17), announceAt: null };
  assert.equal(describe(setting, at(10)).resultsVisible, false);
  assert.equal(describe(setting, at(18)).resultsVisible, true);
});

test("labels: id-ID, same-day range, and datetime-local wall clock", () => {
  assert.equal(label(at(8, 5)), "12 Nov 2026, 08.05");
  assert.equal(localInput(at(8, 5)), "2026-11-12T08:05");
  assert.equal(rangeLabel(at(8), at(17)), "12 Nov 2026, 08.00 – 17.00");
  assert.equal(rangeLabel(at(8), null), "—");
  assert.equal(label("bukan tanggal"), "—");
});

test("parseInput: invalid date and reversed range are rejected at the interface", () => {
  assert.equal(parseInput(fd({ startTime: "bukan tanggal" })).error, "Format tanggal tidak valid.");
  assert.equal(parseInput(fd({ startTime: "2026-11-12T17:00", endTime: "2026-11-12T08:00" })).error,
               "Waktu selesai harus setelah waktu mulai.");
  const ok = parseInput(fd({ startTime: "2026-11-12T08:00", endTime: "2026-11-12T17:00", announceAt: "" }));
  assert.equal(ok.error, undefined);
  assert.equal(ok.data.announceAt, null);
  assert.equal(ok.data.startTime.getHours(), 8);
});
