import ActionForm from "@/components/ActionForm";
import ToggleVoting from "@/components/ToggleVoting";
import Field from "@/components/Field";
import { saveSchedule } from "@/app/actions";
import { current } from "@/lib/jadwal.js";
import AutoRefresh from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

export default async function JadwalPage() {
  const jadwal = await current();
  const open = jadwal.open;

  return (
    <>
      <AutoRefresh />
      <header className="page-head">
        <div>
          <h1>Jadwal &amp; countdown</h1>
          <p>Atur rentang pemungutan suara dan waktu pembukaan hasil.</p>
        </div>
      </header>

      <div className="admin-grid admin-grid--2">
        <section className="panel-card" aria-labelledby="jadwal-form-title">
          <h2 id="jadwal-form-title">Jadwal pemungutan</h2>
          <p className="panel-hint">
            Waktu memakai zona waktu server (WIB). Selesai harus setelah mulai.
            Menyimpan jadwal mengaktifkan otomatisasi: pemungutan dibuka pada waktu
            Mulai dan ditutup pada waktu Selesai tanpa perlu menekan tombol.
            {open && <span className="hint-warn"> Perubahan saat pemungutan sedang berlangsung langsung berlaku ke semua pemilih.</span>}
          </p>

          <ActionForm
            action={saveSchedule}
            submit="Simpan jadwal"
            submitClass="btn-pilih"
            confirm={open ? "Simpan perubahan jadwal saat pemungutan sedang berlangsung? Perubahan langsung berlaku ke semua pemilih." : undefined}
          >
            <Field label="Mulai pemungutan" htmlFor="startTime">
              <input type="datetime-local" className="form-control" id="startTime" name="startTime" defaultValue={jadwal.startInput} />
            </Field>
            <Field label="Selesai pemungutan" htmlFor="endTime">
              <input type="datetime-local" className="form-control" id="endTime" name="endTime" defaultValue={jadwal.endInput} />
            </Field>
            <Field label="Pengumuman hasil" htmlFor="announceAt" help="Hasil terbuka otomatis pada waktu ini.">
              <input type="datetime-local" className="form-control" id="announceAt" name="announceAt" defaultValue={jadwal.announceInput} />
            </Field>
          </ActionForm>
        </section>

        <section className="panel-card" aria-labelledby="jadwal-status-title">
          <h2 id="jadwal-status-title">Status bilik suara</h2>
          <p className="panel-hint">Perubahan berlaku langsung untuk semua pemilih.</p>

          <div className="status-line">
            <span className={`pill ${open ? "pill--ok" : "pill--no"}`}>{open ? "Dibuka" : "Ditutup"}</span>
            <strong>{open ? "Pemungutan suara sedang berlangsung" : "Pemungutan suara dihentikan"}</strong>
          </div>

          <ToggleVoting open={open} />

          <dl className="facts">
            <div><dt>Mulai</dt><dd>{jadwal.startLabel}</dd></div>
            <div><dt>Selesai</dt><dd>{jadwal.endLabel}</dd></div>
            <div><dt>Pengumuman</dt><dd>{jadwal.announceLabel}</dd></div>
          </dl>
        </section>
      </div>
    </>
  );
}
