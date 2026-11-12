import VoterLayout from "@/components/VoterLayout";
import StatusPanel from "@/components/StatusPanel";
import VoteSessionTimer from "@/components/VoteSessionTimer";
import { getSessionUser, LOGOUT_AFTER_VOTE_SECONDS } from "@/lib/guard";
import { fmtDT } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SelesaiPage() {
  const user = await getSessionUser();
  const left = user?.hasVoted && user.votedAt
    ? Math.max(0, LOGOUT_AFTER_VOTE_SECONDS - Math.floor((Date.now() - new Date(user.votedAt).getTime()) / 1000))
    : 0;

  return (
    <VoterLayout>
      {left > 0 && <VoteSessionTimer seconds={left} />}
      <StatusPanel
        tone="success"
        icon="fas fa-check"
        title="Suara Anda sudah tercatat"
        actions={<a className="btn-pilih" href="/hasil">Lihat hasil</a>}
        meta={left > 0 ? "Sesi berakhir otomatis setelah 1 menit" : "Sesi pemilih berakhir otomatis"}
      >
        <p className="panel-sub">Pemilihan Raya Mahasiswa Teknik Telekomunikasi</p>
        <p>Terima kasih sudah menggunakan hak suara. Pilihan Anda tidak ditampilkan di layar ini dan tidak tersimpan bersama identitas Anda.</p>
        {user?.votedAt && <p className="small">Tercatat pada {fmtDT(user.votedAt)}.</p>}
      </StatusPanel>
    </VoterLayout>
  );
}
