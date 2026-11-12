"use client";
import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { saveCandidate, deleteCandidate } from "@/app/actions";
import UploadField from "@/components/UploadField";

const clip = (s, n = 34) => (s && s.length > n ? `${s.slice(0, n)}…` : s ?? "");

// Tabel kandidat: SATU modal untuk tambah/edit (bukan satu modal per baris).
export default function CandidateTable({ candidates }) {
  const [editing, setEditing] = useState(null);
  const dlg = useRef(null);
  const [state, formAction] = useActionState(async (_prev, fd) => (await saveCandidate(fd)), {});

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
          <i className="fas fa-plus" aria-hidden="true" /> Tambah kandidat
        </button>
        <span className="count-chip">{candidates.length} paslon</span>
      </div>

      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Paslon</th>
              <th scope="col">Nomor</th>
              <th scope="col">Visi</th>
              <th scope="col">Misi</th>
              <th scope="col">Suara</th>
              <th scope="col" className="text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.id}>
                <td>
                  <div className="cell-user">
                    {c.photoUrl ? (
                      <img className="thumb" src={c.photoUrl} alt="" width="44" height="44" />
                    ) : (
                      <span className="thumb thumb-empty" aria-hidden="true"><i className="fas fa-user" /></span>
                    )}
                    <span>
                      <span className="cell-strong">{c.leaderName} &amp; {c.viceName}</span>
                      {c.instagram && <span className="cell-sub">@{c.instagram}</span>}
                    </span>
                  </div>
                </td>
                <td><span className="num-chip">{String(c.electionNumber).padStart(2, "0")}</span></td>
                <td><span className="cell-clip" title={c.vision}>{clip(c.vision, 30)}</span></td>
                <td><span className="cell-clip" title={c.mission}>{clip(c.mission, 30)}</span></td>
                <td className="font-weight-bold">{c.votes}</td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="icon-btn" onClick={() => open("edit", c)} aria-label={`Edit ${c.leaderName}`} title="Edit">
                      <i className="fas fa-pen" />
                    </button>
                    {c.votes === 0 ? (
                      <form action={deleteCandidate}>
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          className="icon-btn icon-btn--danger"
                          aria-label={`Hapus ${c.leaderName}`}
                          title="Hapus"
                          onClick={(e) => { if (!window.confirm(`Hapus kandidat ${c.leaderName}?`)) e.preventDefault(); }}
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </form>
                    ) : (
                      <span className="pill pill--muted" title="Sudah ada suara sehingga tidak dapat dihapus">Terkunci</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dialog className="vote-dialog" ref={dlg} aria-labelledby="edit-candidate-title">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <form action={formAction}>
              <div className="modal-header">
                <h5 className="modal-title" id="edit-candidate-title">
                  {editing?.mode === "add" ? "Tambah kandidat" : "Edit kandidat"}
                </h5>
                <button type="button" className="close" onClick={close} aria-label="Tutup">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                {editing?.mode === "edit" && <input type="hidden" name="id" value={editing.row.id} />}
                <div className="form-grid">
                  <label className="field">
                    <span>Nama ketua</span>
                    <input type="text" name="leaderName" className="form-control" defaultValue={editing?.row?.leaderName ?? ""} required />
                  </label>
                  <label className="field">
                    <span>Nama wakil</span>
                    <input type="text" name="viceName" className="form-control" defaultValue={editing?.row?.viceName ?? ""} required />
                  </label>
                  <label className="field">
                    <span>Nomor urut</span>
                    <input type="number" name="electionNumber" min="1" className="form-control" defaultValue={editing?.row?.electionNumber ?? ""} required />
                  </label>
                  <label className="field">
                    <span>Instagram</span>
                    <input type="text" name="instagram" className="form-control" placeholder="@username" defaultValue={editing?.row?.instagram ?? ""} />
                  </label>
                </div>
                <label className="field">
                  <span>Visi</span>
                  <textarea name="vision" className="form-control" rows="2" defaultValue={editing?.row?.vision ?? ""} required />
                </label>
                <label className="field">
                  <span>Misi</span>
                  <textarea name="mission" className="form-control" rows="3" defaultValue={editing?.row?.mission ?? ""} required />
                </label>
                <div className="form-grid">
                  <UploadField name="photoUrl" kind="photo" label="Foto paslon" initial={editing?.row?.photoUrl} />
                  <UploadField name="cvUrl" kind="cv" label="CV (PDF)" initial={editing?.row?.cvUrl} />
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
