import LazyTable from "@/components/LazyTable";
import ModalForm from "@/components/ModalForm";
import Field from "@/components/Field";
import DeleteForm from "@/components/DeleteForm";
import ActionForm from "@/components/ActionForm";
import { saveUser, deleteUser, importVotersCsv } from "@/app/actions";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const initials = (name) => String(name ?? "").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

export default async function PemilihPage() {
  const voters = await prisma.user.findMany({ where: { role: "VOTER" }, orderBy: { name: "asc" } });
  const voted = voters.filter((v) => v.hasVoted).length;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Pemilih</h1>
          <p>Kelola daftar pemilih tetap dan status penggunaan hak suara.</p>
        </div>
        <a href="#" className="btn-pilih" data-toggle="modal" data-target="#addVotersModal">
          <i className="fas fa-plus" aria-hidden="true" /> Tambah pemilih
        </a>
      </header>

      <section className="data-card" aria-labelledby="pemilih-table-title">
        <div className="data-card-head">
          <h2 id="pemilih-table-title">Daftar data pemilih</h2>
          <span className="count-chip">{voters.length} pemilih · {voted} sudah memilih</span>
        </div>
        <div className="data-card-body">
          <div className="table-responsive">
            <LazyTable>
              <table className="table admin-table" id="dataTable">
                <thead>
                  <tr>
                    <th scope="col">Nama</th>
                    <th scope="col" className="d-none d-md-table-cell">NIM</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-right" data-orderable="false">Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {voters.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <div className="cell-user">
                          <span className="avatar" aria-hidden="true">{initials(v.name)}</span>
                          <span>
                            <span className="cell-strong">{v.name}</span>
                            <span className="cell-sub">{v.email}</span>
                          </span>
                        </div>
                      </td>
                      <td className="tnum d-none d-md-table-cell">{v.nim}</td>
                      <td>
                        {v.hasVoted
                          ? <span className="pill pill--ok">Sudah memilih</span>
                          : <span className="pill pill--no">Belum memilih</span>}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="icon-btn" aria-label={`Edit pemilih ${v.name}`} title="Edit"
                            data-toggle="modal" data-target={`#editVoter${v.id}`}>
                            <i className="fas fa-pen" />
                          </button>
                          <DeleteForm action={deleteUser} id={v.id} label={`Hapus pemilih ${v.name}`} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </LazyTable>
          </div>
        </div>
      </section>

      <section className="panel-card" aria-labelledby="csv-title">
        <h2 id="csv-title">Impor DPT dari CSV</h2>
        <p className="panel-hint">Satu pemilih per baris dengan format NIM, Nama, Email, Password. Baris dengan NIM atau email yang sudah ada akan dilewati.</p>
        <ActionForm action={importVotersCsv} submit="Impor CSV" submitClass="btn-pilih">
          <Field label="File CSV" htmlFor="csvFile">
            <input id="csvFile" name="file" type="file" accept=".csv,text/csv" className="form-control" required />
          </Field>
        </ActionForm>
      </section>

      <ModalForm id="addVotersModal" title="Tambah pemilih" action={saveUser} submit="Tambah pemilih">
        <input type="hidden" name="role" value="VOTER" />
        <div className="form-grid">
          <Field label="Nama" htmlFor="add-name"><input id="add-name" type="text" name="name" className="form-control" autoComplete="name" required /></Field>
          <Field label="NIM" htmlFor="add-nim"><input id="add-nim" type="text" name="nim" className="form-control" inputMode="numeric" required /></Field>
          <Field label="Email" htmlFor="add-email"><input id="add-email" type="email" name="email" className="form-control" autoComplete="email" required /></Field>
          <Field label="Password" htmlFor="add-password" help="Minimal 8 karakter. Bagikan lewat kanal resmi."><input id="add-password" type="text" name="password" className="form-control" minLength={8} required /></Field>
        </div>
      </ModalForm>

      {voters.map((v) => (
        <ModalForm key={v.id} id={`editVoter${v.id}`} title="Edit pemilih" action={saveUser} submit="Simpan perubahan">
          <input type="hidden" name="id" value={v.id} />
          <input type="hidden" name="role" value="VOTER" />
          <div className="form-grid">
            <Field label="Nama" htmlFor={`ev-${v.id}-name`}><input id={`ev-${v.id}-name`} type="text" name="name" className="form-control" defaultValue={v.name} required /></Field>
            <Field label="NIM" htmlFor={`ev-${v.id}-nim`}><input id={`ev-${v.id}-nim`} type="text" name="nim" className="form-control" defaultValue={v.nim ?? ""} required /></Field>
            <Field label="Email" htmlFor={`ev-${v.id}-email`}><input id={`ev-${v.id}-email`} type="email" name="email" className="form-control" defaultValue={v.email} required /></Field>
            <Field label="Password" htmlFor={`ev-${v.id}-pw`} help="Kosongkan bila tidak diubah."><input id={`ev-${v.id}-pw`} type="text" name="password" className="form-control" autoComplete="new-password" /></Field>
          </div>
        </ModalForm>
      ))}
    </>
  );
}
