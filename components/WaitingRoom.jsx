"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import StatusPanel from "./StatusPanel";

// Halaman tunggu: status antrean di-refresh otomatis tiap 5 detik sampai giliran tiba.
export default function WaitingRoom({ position, etaMinutes, slots, inBooth }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <StatusPanel
      icon="fas fa-users"
      title="Anda dalam antrean"
      meta={<>Bilik suara dipakai {inBooth} dari {slots} pemilih</>}
      actions={
        <>
          <button type="button" className="btn-outline" onClick={() => router.refresh()}>Cek status sekarang</button>
          <a className="btn-outline" href="/keluar">Batalkan antrean</a>
        </>
      }
    >
      <p className="panel-sub">Pemilihan Raya Mahasiswa Teknik Telekomunikasi</p>
      <div className="queue-figure" aria-live="polite">
        <span>Posisi</span>
        <strong>#{position}</strong>
      </div>
      <p>
        Perkiraan menunggu ±<strong>{etaMinutes} menit</strong>. Halaman ini memperbarui status otomatis
        setiap 5 detik — biarkan tab tetap terbuka.
      </p>
    </StatusPanel>
  );
}
