import ActionForm from "@/components/ActionForm";
import ToggleVoting from "@/components/ToggleVoting";
import Field from "@/components/Field";
import { saveSchedule } from "@/app/actions";
import { getSetting, votingOpen } from "@/lib/guard";
import { fmtDT, toLocalInput } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function JadwalPage() {
  const setting = await getSetting();
  const open = votingOpen(setting);

  return (
    <>
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
            {open && <span className="hint-warn"> Perubahan saat pemungutan sedang berlangsung langsung berlaku ke semua pemilih.</span>}
          </p>

          <ActionForm
            action={saveSchedule}
            submit="Simpan jadwal"
            submitClass="btn-pilih"
            confirm={open ? "Simpan perubahan jadwal saat pemungutan sedang berlangsung? Perubahan langsung berlaku ke semua pemilih." : undefined}
          >
            <Field label="Mulai pemungutan" htmlFor="startTime">
              <input type="datetime-local" className="form-control" id="startTime" name="startTime" defaultValue={toLocalInput(setting?.startTime)} />
            </Field>
            <Field label="Selesai pemungutan" htmlFor="endTime">
              <input type="datetime-local" className="form-control" id="endTime" name="endTime" defaultValue={toLocalInput(setting?.endTime)} />
            </Field>
            <Field label="Pengumuman hasil" htmlFor="announceAt" help="Hasil terbuka otomatis pada waktu ini.">
              <input type="datetime-local" className="form-control" id="announceAt" name="announceAt" defaultValue={toLocalInput(setting?.announceAt)} />
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
            <div><dt>Mulai</dt><dd>{fmtDT(setting?.startTime)}</dd></div>
            <div><dt>Selesai</dt><dd>{fmtDT(setting?.endTime)}</dd></div>
            <div><dt>Pengumuman</dt><dd>{fmtDT(setting?.announceAt)}</dd></div>
          </dl>
        </section>
      </div>
    </>
  );
}
