import VoterLayout from "@/components/VoterLayout";
import StatusPanel from "@/components/StatusPanel";

export default function SelesaiPage() {
  return (
    <VoterLayout>
      <StatusPanel
        tone="success"
        icon="fas fa-check"
        title="Suara Anda sudah tercatat"
        actions={<a className="btn-pilih" href="/hasil">Lihat hasil</a>}
        meta="Sesi pemilih berakhir otomatis"
      >
        <p className="panel-sub">Pemilihan Raya Mahasiswa Teknik Telekomunikasi</p>
        <p>Terima kasih sudah menggunakan hak suara. Pilihan Anda tidak ditampilkan di layar ini dan tidak tersimpan bersama identitas Anda.</p>
      </StatusPanel>
    </VoterLayout>
  );
}
