import VoterLayout from "@/components/VoterLayout";
import AutoRefresh from "@/components/AutoRefresh";
import Ballot from "@/components/Ballot";
import StatusPanel from "@/components/StatusPanel";
import WaitingRoom from "@/components/WaitingRoom";
import { requireUser } from "@/lib/guard";
import { current } from "@/lib/jadwal.js";
import { prisma } from "@/lib/db";
import { fmtDT } from "@/lib/format";
import { enter, BOOTH_MINUTES } from "@/lib/booth.js";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MilihPage() {
  const user = await requireUser("VOTER");
  const jadwal = await current();
  const queue = await enter(user);

  if (queue.state === "closed") {
    return (
      <VoterLayout>
        <AutoRefresh />
        <StatusPanel
          icon="far fa-clock"
          actions={<a className="btn-outline" href="/hasil">Lihat hasil pemilihan</a>}
          meta={<>Jadwal: {jadwal.rangeLabel}</>}
        >
          <p className="panel-sub">Pemilihan Raya Mahasiswa Teknik Telekomunikasi</p>
          <p>Halo <strong>{user.name}</strong>, bilik suara sedang ditutup. Anda tidak dapat mengirim suara di luar jadwal.</p>
        </StatusPanel>
      </VoterLayout>
    );
  }

  if (queue.state === "voted" || user.hasVoted) {
    return (
      <VoterLayout>
        <StatusPanel
          tone="success"
          icon="fas fa-check"
          title="Suara Anda sudah tercatat"
          actions={<a className="btn-pilih" href="/hasil">Lihat hasil pemilihan</a>}
          meta={<>Tercatat pada {fmtDT(user.votedAt)}</>}
        >
          <p className="panel-sub">Pemilihan Raya Mahasiswa Teknik Telekomunikasi</p>
          <p>Halo <strong>{user.name}</strong>, akun Anda sudah mengirim suara. Satu pemilih hanya dapat memilih satu kali.</p>
          <p className="small">Demi kerahasiaan, sistem tidak menyimpan paslon yang Anda pilih pada data pemilih.</p>
          
        </StatusPanel>
      </VoterLayout>
    );
  }

  // batas waktu habis tetapi request ini datang sebelum sweep: keluar paksa
  if (queue.state === "expired") redirect("/waktu-habis");

  if (queue.state === "waiting") {
    return (
      <VoterLayout>
        <WaitingRoom position={queue.position} etaMinutes={queue.etaMinutes} slots={queue.slots} inBooth={queue.inBooth} />
      </VoterLayout>
    );
  }

  const candidates = await prisma.candidate.findMany({ orderBy: { electionNumber: "asc" } });
  return (
    <VoterLayout>
      {candidates.length === 0 ? (
        <StatusPanel icon="fas fa-users" title="Belum ada paslon">
          <p>Pasangan calon belum didaftarkan. Silakan cek kembali nanti.</p>
        </StatusPanel>
      ) : (
        <Ballot
          candidates={candidates}
          user={{ name: user.name, nim: user.nim }}
          rangeLabel={jadwal.rangeLabel}
          deadline={queue.deadline ?? user.voteDeadline}
          secondsLeft={queue.secondsLeft}
          limitMinutes={BOOTH_MINUTES}
        />
      )}
    </VoterLayout>
  );
}
