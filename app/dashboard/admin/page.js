import LazyTable from "@/components/LazyTable";
import ModalForm from "@/components/ModalForm";
import Field from "@/components/Field";
import DeleteForm from "@/components/DeleteForm";
import { saveUser, deleteUser } from "@/app/actions";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const initials = (name) => String(name ?? "").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

export default async function AdminPage() {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, orderBy: { name: "asc" } });

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Admin</h1>
          <p>Kelola akun penyelenggara yang dapat mengakses panel ini.</p>
        </div>
        <a href="#" className="btn-pilih" data-toggle="modal" data-target="#addAdminModal">
          <i className="fas fa-plus" aria-hidden="true" /> Tambah admin
        </a>
      </header>

      <section className="data-card" aria-labelledby="admin-table-title">
        <div className="data-card-head">
          <h2 id="admin-table-title">Daftar data admin</h2>
          <span className="count-chip">{admins.length} akun</span>
        </div>
        <div className="data-card-body">
          <div className="table-responsive">
            <LazyTable>
              <table className="table admin-table" id="dataTable">
                <thead>
                  <tr><th scope="col">Nama</th><th scope="col">Email</th><th scope="col" className="text-right" data-orderable="false">Tindakan</th></tr>
                </thead>
                <tbody>
                  {admins.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div className="cell-user">
                          <span className="avatar" aria-hidden="true">{initials(a.name)}</span>
                          <span className="cell-strong">{a.name}</span>
                        </div>
                      </td>
                      <td>{a.email}</td>
                      <td>
                        <div className="row-actions">
                          <button className="icon-btn" data-toggle="modal" data-target={`#editAdmin${a.id}`} aria-label={`Edit admin ${a.name}`} title="Edit">
                            <i className="fas fa-pen" />
                          </button>
                          <DeleteForm action={deleteUser} id={a.id} label={`Hapus admin ${a.name}`} />
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

      <ModalForm id="addAdminModal" title="Tambah admin" action={saveUser} submit="Tambah admin">
        <input type="hidden" name="role" value="ADMIN" />
        <div className="form-grid">
          <Field label="Nama" htmlFor="add-admin-name"><input id="add-admin-name" type="text" name="name" className="form-control" required /></Field>
          <Field label="Email" htmlFor="add-admin-email"><input id="add-admin-email" type="email" name="email" className="form-control" autoComplete="email" required /></Field>
          <Field label="Password" htmlFor="add-admin-pw" help="Minimal 8 karakter."><input id="add-admin-pw" type="text" name="password" className="form-control" minLength={8} required /></Field>
        </div>
      </ModalForm>

      {admins.map((a) => (
        <ModalForm key={a.id} id={`editAdmin${a.id}`} title="Edit admin" action={saveUser} submit="Simpan perubahan">
          <input type="hidden" name="id" value={a.id} />
          <input type="hidden" name="role" value="ADMIN" />
          <div className="form-grid">
            <Field label="Nama" htmlFor={`ea-${a.id}-name`}><input id={`ea-${a.id}-name`} type="text" name="name" className="form-control" defaultValue={a.name} required /></Field>
            <Field label="Email" htmlFor={`ea-${a.id}-email`}><input id={`ea-${a.id}-email`} type="email" name="email" className="form-control" defaultValue={a.email} required /></Field>
            <Field label="Password" htmlFor={`ea-${a.id}-pw`} help="Kosongkan bila tidak diubah."><input id={`ea-${a.id}-pw`} type="text" name="password" className="form-control" autoComplete="new-password" /></Field>
          </div>
        </ModalForm>
      ))}
    </>
  );
}
