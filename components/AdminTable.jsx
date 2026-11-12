"use client";
import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { saveUser, deleteUser } from "@/app/actions";

const initials = (name) => String(name ?? "").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

// Tabel admin: satu modal untuk tambah/edit (bukan satu modal per baris).
export default function AdminTable({ admins }) {
  const [editing, setEditing] = useState(null);
  const dlg = useRef(null);
  const [state, formAction] = useActionState(async (_prev, fd) => (await saveUser(fd)), {});

  function open(mode, row) {
    setEditing({ mode, row });
    dlg.current?.showModal();
  }
  useEffect(() => {
    if (state?.ok) close();
  }, [state]);

  function close() {
    dlg.current?.close();
  }

  return (
    <>
      <div className="table-toolbar">
        <button type="button" className="btn-pilih" onClick={() => open("add", null)}>
          <i className="fas fa-plus" aria-hidden="true" /> Tambah admin
        </button>
      </div>

      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Nama</th>
              <th scope="col">Email</th>
              <th scope="col" className="text-right">Tindakan</th>
            </tr>
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
                    <button type="button" className="icon-btn" onClick={() => open("edit", a)} aria-label={`Edit ${a.name}`} title="Edit">
                      <i className="fas fa-pen" />
                    </button>
                    <form action={deleteUser}>
                      <input type="hidden" name="id" value={a.id} />
                      <button
                        type="submit"
                        className="icon-btn icon-btn--danger"
                        aria-label={`Hapus ${a.name}`}
                        title="Hapus"
                        onClick={(e) => { if (!window.confirm(`Hapus admin ${a.name}?`)) e.preventDefault(); }}
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dialog className="vote-dialog" ref={dlg} aria-labelledby="edit-admin-title">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <form action={formAction}>
              <div className="modal-header">
                <h5 className="modal-title" id="edit-admin-title">
                  {editing?.mode === "add" ? "Tambah admin" : "Edit admin"}
                </h5>
                <button type="button" className="close" onClick={close} aria-label="Tutup">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                {editing?.mode === "edit" && <input type="hidden" name="id" value={editing.row.id} />}
                <input type="hidden" name="role" value="ADMIN" />
                <div className="form-grid">
                  <label className="field">
                    <span>Nama</span>
                    <input type="text" name="name" className="form-control" defaultValue={editing?.row?.name ?? ""} required />
                  </label>
                  <label className="field">
                    <span>Email</span>
                    <input type="email" name="email" className="form-control" defaultValue={editing?.row?.email ?? ""} required />
                  </label>
                  <label className="field">
                    <span>Password</span>
                    <input type="text" name="password" className="form-control" autoComplete="new-password" placeholder="Kosongkan bila tidak diubah" />
                  </label>
                </div>
              </div>
              {state?.error && (
                <div className="alert alert-danger mb-0" role="alert">{state.error}</div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={close}>Batal</button>
                <button type="submit" className="btn-pilih">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
