import VoterLayout from "@/components/VoterLayout";
import StatusPanel from "@/components/StatusPanel";

export const metadata = { title: "Waktu habis — PEMIRA" };

export default function WaktuHabisPage() {
  return (
    <VoterLayout>
      <StatusPanel
        tone="wait"
        icon="far fa-hourglass"
        title="Waktu memilih habis"
        actions={<a className="btn-pilih" href="/">Masuk kembali</a>}
        meta={<>Sesi pemilih berakhir otomatis setelah 5 menit di bilik suara</>}
      >
        <p className="panel-sub">Pemilihan Raya Mahasiswa Teknik Telekomunikasi</p>
        <p>Anda tidak mengirim suara dalam batas waktu, jadi slot bilik suara Anda dilepas ke pemilih berikutnya.</p>
        <p className="small">Selama jadwal pemungutan masih terbuka, Anda bisa masuk kembali dan mengantre lagi.</p>
      </StatusPanel>
    </VoterLayout>
  );
}
