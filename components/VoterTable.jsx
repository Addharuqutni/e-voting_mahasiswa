"use client";
import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { saveUser, deleteUser } from "@/app/actions";

const PAGE_SIZE = 25;
const initials = (name) => String(name ?? "").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

function q(page, search) {
  const p = new URLSearchParams();
  if (search) p.set("q", search);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

// Tabel pemilih: server-side pagination + pencarian (query string), SATU modal edit
// (bukan satu modal per baris) supaya halaman tetap ringan untuk DPT besar.
export default function VoterTable({ users, total, page, search }) {
  const [editing, setEditing] = useState(null);
  const dlg = useRef(null);
  const [state, formAction] = useActionState(async (_prev, fd) => (await saveUser(fd)), {});
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

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
          <i className="fas fa-plus" aria-hidden="true" /> Tambah pemilih
        </button>
      </div>

      <form className="table-search" method="get">
        <label htmlFor="q" className="sr-only">Cari pemilih</label>
        <input id="q" type="search" name="q" defaultValue={search} placeholder="Cari nama, NIM, atau email" />
        <button type="submit" className="btn-outline">Cari</button>
        {search && <a className="btn-outline" href="/dashboard/pemilih">Reset</a>}
      </form>

      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Nama</th>
              <th scope="col">NIM</th>
              <th scope="col">Status</th>
              <th scope="col" className="text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {users.map((v) => (
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
                <td className="tnum">{v.nim}</td>
                <td>
                  {v.hasVoted
                    ? <span className="pill pill--ok">Sudah memilih</span>
                    : <span className="pill pill--no">Belum memilih</span>}
                </td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="icon-btn" onClick={() => open("edit", v)} aria-label={`Edit ${v.name}`} title="Edit">
                      <i className="fas fa-pen" />
                    </button>
                    <form action={deleteUser}>
                      <input type="hidden" name="id" value={v.id} />
                      <button
                        type="submit"
                        className="icon-btn icon-btn--danger"
                        aria-label={`Hapus ${v.name}`}
                        title="Hapus"
                        onClick={(e) => { if (!window.confirm(`Hapus pemilih ${v.name}?`)) e.preventDefault(); }}
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={4} className="table-empty">Tidak ada pemilih yang cocok.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-foot">
        <span>Menampilkan {from}–{to} dari {total} pemilih</span>
        <span className="table-pager">
          <a className={page <= 1 ? "is-disabled" : ""} href={`/dashboard/pemilih${q(page - 1, search)}`} aria-disabled={page <= 1}>Sebelumnya</a>
          <span className="tnum">Hal. {page} / {pages}</span>
          <a className={page >= pages ? "is-disabled" : ""} href={`/dashboard/pemilih${q(page + 1, search)}`} aria-disabled={page >= pages}>Berikutnya</a>
        </span>
      </div>

      <dialog className="vote-dialog" ref={dlg} aria-labelledby="edit-voter-title">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <form action={formAction}>
              <div className="modal-header">
                <h5 className="modal-title" id="edit-voter-title">
                  {editing?.mode === "add" ? "Tambah pemilih" : "Edit pemilih"}
                </h5>
                <button type="button" className="close" onClick={close} aria-label="Tutup">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                {editing?.mode === "edit" && <input type="hidden" name="id" value={editing.row.id} />}
                <input type="hidden" name="role" value="VOTER" />
                <div className="form-grid">
                  <label className="field">
                    <span>Nama</span>
                    <input type="text" name="name" className="form-control" defaultValue={editing?.row?.name ?? ""} required />
                  </label>
                  <label className="field">
                    <span>NIM</span>
                    <input type="text" name="nim" className="form-control" defaultValue={editing?.row?.nim ?? ""} required />
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
