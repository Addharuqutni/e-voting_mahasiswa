import BarChart from "@/components/BarChart";
import ChartLoader from "@/components/ChartLoader";
import { prisma } from "@/lib/db";
import { getSetting, votingOpen } from "@/lib/guard";
import { fmtRange, pct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [totalVoters, votersWhoVoted, candidates, votes, setting] = await Promise.all([
    prisma.user.count({ where: { role: "VOTER" } }),
    prisma.user.count({ where: { role: "VOTER", hasVoted: true } }),
    prisma.candidate.findMany({ orderBy: { electionNumber: "asc" } }),
    prisma.vote.groupBy({ by: ["candidateId"], _count: { _all: true } }),
    getSetting(),
  ]);
  const counts = Object.fromEntries(votes.map((v) => [v.candidateId, v._count._all]));
  const chartData = Object.fromEntries(candidates.map((c) => [String(c.electionNumber), counts[c.id] ?? 0]));
  const totalVotes = Object.values(chartData).reduce((a, b) => a + b, 0);
  const turnout = pct(votersWhoVoted, totalVoters);
  const open = votingOpen(setting);

  return (
    <>
      <div className="dash-head">
        <div>
          <h1>Dashboard</h1>
          <p className={`dash-sub${open ? "" : " is-closed"}`}>
            <span className="status-dot" aria-hidden="true" />
            {open ? "Pemungutan suara dibuka" : "Pemungutan suara ditutup"}
            <span className="dash-sub-sep" aria-hidden="true">·</span>
            {fmtRange(setting?.startTime, setting?.endTime)}
          </p>
        </div>
      </div>

      <div className="dash-stats">
        <div className="stat">
          <span className="stat-icon" aria-hidden="true"><i className="fas fa-users" /></span>
          <div>
            <span className="stat-label">Total pemilih</span>
            <strong className="stat-value">{totalVoters}</strong>
          </div>
        </div>
        <div className="stat">
          <span className="stat-icon stat-icon--success" aria-hidden="true"><i className="fas fa-check" /></span>
          <div>
            <span className="stat-label">Sudah memilih</span>
            <strong className="stat-value">{votersWhoVoted}</strong>
          </div>
        </div>
        <div className="stat">
          <span className="stat-icon stat-icon--brand" aria-hidden="true"><i className="fas fa-chart-bar" /></span>
          <div className="stat-turnout">
            <span className="stat-label">Partisipasi</span>
            <strong className="stat-value">{turnout}%</strong>
            <div className="stat-track" role="img" aria-label={`Partisipasi ${turnout}% dari ${totalVoters} pemilih`}>
              <span style={{ width: `${turnout}%` }} />
            </div>
          </div>
        </div>
      </div>

      <ChartLoader />
      <section className="dash-card" aria-labelledby="dash-chart-title">
        <div className="dash-card-head">
          <div>
            <h2 id="dash-chart-title">Perolehan suara</h2>
            <p>{totalVotes > 0 ? `Sementara · ${totalVotes} suara masuk` : "Belum ada suara masuk"}</p>
          </div>
        </div>
        {totalVotes > 0 ? <BarChart data={chartData} /> : <p className="dash-empty">Grafik akan muncul setelah pemilih mulai mengirim suara.</p>}
      </section>
    </>
  );
}
