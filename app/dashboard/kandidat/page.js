import CandidateTable from "@/components/CandidateTable";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function KandidatPage() {
  const candidates = await prisma.candidate.findMany({
    orderBy: { electionNumber: "asc" },
    include: { _count: { select: { votes: true } } },
  });

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Kandidat</h1>
          <p>Kelola pasangan calon, visi-misi, dan berkas pendukung.</p>
        </div>
      </header>

      <section className="data-card" aria-labelledby="kandidat-table-title">
        <div className="data-card-head">
          <h2 id="kandidat-table-title">Daftar kandidat pemilihan raya</h2>
        </div>
        <div className="data-card-body">
          <CandidateTable candidates={candidates} />
        </div>
      </section>
    </>
  );
}
