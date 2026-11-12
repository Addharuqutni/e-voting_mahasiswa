import { prisma } from "./db.js";

// Menulis satu suara.
//
// Catatan desain: SQLite hanya boleh satu penulis pada satu waktu. Transaksi
// interaktif (BEGIN ... COMMIT) pada SQLite bisa mati karena lock upgrade
// (SQLITE_BUSY) saat banyak pemilih memilih bersamaan. Karena itu klaim
// "sudah memilih" dilakukan dengan SATU statement atomik
// (UPDATE ... WHERE hasVoted = 0), lalu baris ballot disimpan terpisah.
// Baris ballot tetap tanpa kolom identitas (rahasia suara) dan tidak ada FK
// ke user, jadi tidak ada jalur yang menghubungkan pemilih dengan pilihannya.
//
// Jika penyimpanan ballot gagal, klaim dilepas (kompensasi) supaya pemilih bisa
// memilih ulang; kondisi crash di antara dua langkah hanya menyebabkan satu
// pemilik terclaim tanpa baris ballot (sangat jarang, dan tidak menggandakan
// suara).
const isBusy = (e) => {
  const code = e?.code ?? "";
  const msg = String(e?.message ?? "");
  return code === "P1008" || code === "P2034" || /database is locked|busy|timeout/i.test(msg);
};

async function withRetry(fn, attempts = 4) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!isBusy(e)) throw e;
      await new Promise((r) => setTimeout(r, 40 * (i + 1)));
    }
  }
  throw last;
}

export async function castVote({ userId, candidateId }) {
  const claimed = await withRetry(() =>
    prisma.user.updateMany({
      where: { id: userId, hasVoted: false },
      data: { hasVoted: true, votedAt: new Date() },
    })
  );
  if (claimed.count !== 1) return { error: "ALREADY_VOTED" };

  try {
    await withRetry(() => prisma.vote.create({ data: { candidateId } }));
  } catch {
    // lepaskan klaim supaya bisa mencoba lagi
    await prisma.user
      .updateMany({ where: { id: userId, hasVoted: true }, data: { hasVoted: false, votedAt: null } })
      .catch(() => {});
    return { error: "Gagal menyimpan suara, coba lagi." };
  }
  return { ok: true };
}
