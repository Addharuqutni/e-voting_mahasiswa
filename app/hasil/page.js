import VoterLayout from "@/components/VoterLayout";
import StatusPanel from "@/components/StatusPanel";
import BarChart from "@/components/BarChart";
import ChartLoader from "@/components/ChartLoader";
import { getSessionUser } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { current } from "@/lib/jadwal.js";
import { pct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HasilPage() {
  const user = await getSessionUser();
  const jadwal = await current();
  const [candidates, votes] = await Promise.all([
    prisma.candidate.findMany({ orderBy: { electionNumber: "asc" } }),
    prisma.vote.groupBy({ by: ["candidateId"], _count: { _all: true } }),
  ]);
  const counts = Object.fromEntries(votes.map((v) => [v.candidateId, v._count._all]));
  const chartData = Object.fromEntries(candidates.map((c) => [String(c.electionNumber), counts[c.id] ?? 0]));
  const total = Object.values(chartData).reduce((a, b) => a + b, 0);
  const open = jadwal.open;
  const visible = user?.role === "ADMIN" || jadwal.resultsVisible;

  if (!visible) {
    const canVote = open && user?.role === "VOTER" && !user.hasVoted;
    return (
      <VoterLayout>
        <StatusPanel
          tone="wait"
          icon="far fa-clock"
          title="Hasil masih terkunci"
          meta={
            <dl className="panel-facts">
              <div><dt>Pemungutan suara</dt><dd>{jadwal.rangeLabel}</dd></div>
              <div><dt>Pengumuman hasil</dt><dd>{jadwal.announceLabel}</dd></div>
            </dl>
          }
          actions={
            canVote ? <a className="btn-pilih" href="/milih">Masuk ke bilik suara</a>
              : !user && open ? <a className="btn-pilih" href="/">Masuk untuk memilih</a>
              : null
          }
        >
          <p className="panel-sub">Pemilihan Raya Mahasiswa Teknik Telekomunikasi</p>
          <p>{user?.hasVoted ? "Suara Anda sudah tercatat. Hasil tampil otomatis setelah diumumkan." : "Anda belum menggunakan hak suara. Hasil tampil otomatis setelah diumumkan."}</p>
        </StatusPanel>
      </VoterLayout>
    );
  }

  return (
    <VoterLayout>
      <ChartLoader />
      <div className="results-wrap">
        <div className="results-head">
          <h1>Hasil Pemilihan</h1>
          <p>Pemilihan Raya Mahasiswa Teknik Telekomunikasi</p>
        </div>

        <section className="results-card" aria-labelledby="results-title">
          <h2 id="results-title">Perolehan suara</h2>
          <p className="results-sub">
            {total > 0 ? `Total ${total} suara sah · ${candidates.length} paslon` : `Belum ada suara tercatat · ${candidates.length} paslon`}
          </p>
          {total > 0 ? (
            <>
              <BarChart data={chartData} />
              <table className="results-table">
                <caption className="sr-only">Rekapitulasi perolehan suara per paslon</caption>
                <thead>
                  <tr><th scope="col">Paslon</th><th scope="col" className="num">Suara</th><th scope="col" className="num">Persentase</th></tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id}>
                      <th scope="row"><span className="results-no">{c.electionNumber}</span><span className="results-names"><span>{c.leaderName}</span><span>{c.viceName}</span></span></th>
                      <td className="num">{counts[c.id] ?? 0}</td>
                      <td className="num">{pct(counts[c.id] ?? 0, total)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><th scope="row">Total</th><td className="num">{total}</td><td className="num">100%</td></tr>
                </tfoot>
              </table>
            </>
          ) : <p className="results-empty">Belum ada suara yang masuk.</p>}
        </section>
      </div>
    </VoterLayout>
  );
}
