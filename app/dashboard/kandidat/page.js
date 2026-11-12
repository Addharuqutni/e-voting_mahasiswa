import LazyTable from "@/components/LazyTable";
import ModalForm from "@/components/ModalForm";
import Field from "@/components/Field";
import DeleteForm from "@/components/DeleteForm";
import UploadField from "@/components/UploadField";
import { saveCandidate, deleteCandidate } from "@/app/actions";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const clip = (s, n = 34) => (s && s.length > n ? `${s.slice(0, n)}…` : s ?? "");

export default async function KandidatPage() {
  const candidates = await prisma.candidate.findMany({
    orderBy: { electionNumber: "asc" },
    include: { _count: { select: { votes: true } } },
  });

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Kandidat</h1>
          <p>Kelola pasangan calon, visi-misi, dan berkas pendukung.</p>
        </div>
        <a href="#" className="btn-pilih" data-toggle="modal" data-target="#addCandidateModal">
          <i className="fas fa-plus" aria-hidden="true" /> Tambah kandidat
        </a>
      </header>

      <section className="data-card" aria-labelledby="kandidat-table-title">
        <div className="data-card-head">
          <h2 id="kandidat-table-title">Daftar kandidat pemilihan raya</h2>
          <span className="count-chip">{candidates.length} paslon</span>
        </div>
        <div className="data-card-body">
          <div className="table-responsive">
            <LazyTable>
              <table className="table admin-table" id="dataTable">
                <thead>
                  <tr>
                    <th scope="col">Paslon</th>
                    <th scope="col">Nomor</th>
                    <th scope="col" className="d-none d-lg-table-cell">Visi</th>
                    <th scope="col" className="d-none d-lg-table-cell">Misi</th>
                    <th scope="col">Suara</th>
                    <th scope="col" className="text-right" data-orderable="false">Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="cell-user">
                          {c.photoUrl ? (
                            <img className="thumb" src={c.photoUrl} alt="" />
                          ) : (
                            <span className="thumb thumb-empty" aria-hidden="true"><i className="fas fa-user" /></span>
                          )}
                          <span>
                            <span className="cell-strong">{c.leaderName} &amp; {c.viceName}</span>
                            {c.instagram && <span className="cell-sub">@{c.instagram}</span>}
                          </span>
                        </div>
                      </td>
                      <td><span className="num-chip">{(String(c.electionNumber).padStart(2, "0"))}</span></td>
                      <td className="d-none d-lg-table-cell"><span className="cell-clip" title={c.vision}>{clip(c.vision, 30)}</span></td>
                      <td className="d-none d-lg-table-cell"><span className="cell-clip" title={c.mission}>{clip(c.mission, 30)}</span></td>
                      <td className="font-weight-bold">{c._count.votes}</td>
                      <td>
                        <div className="row-actions">
                          <button className="icon-btn" data-toggle="modal" data-target={`#editCandidate${c.id}`} aria-label={`Edit kandidat ${c.leaderName}`} title="Edit">
                            <i className="fas fa-pen" />
                          </button>
                          {c.cvUrl && (
                            <a className="icon-btn" href={`/api/cv/${c.id}`} target="_blank" rel="noopener noreferrer" aria-label={`Buka CV ${c.leaderName}`} title="Buka CV"><i className="far fa-file-pdf" /></a>
                          )}
                          {c._count.votes === 0
                            ? <DeleteForm action={deleteCandidate} id={c.id} label={`Hapus kandidat ${c.leaderName}`} />
                            : <span className="pill pill--muted" title="Paslon sudah memiliki suara sehingga tidak dapat dihapus">Terkunci</span>}
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

      <ModalForm id="addCandidateModal" title="Tambah kandidat" action={saveCandidate} submit="Tambah kandidat">
        <div className="form-grid">
          <Field label="Nama ketua" htmlFor="add-leader"><input id="add-leader" type="text" className="form-control" name="leaderName" required /></Field>
          <Field label="Nama wakil" htmlFor="add-vice"><input id="add-vice" type="text" className="form-control" name="viceName" required /></Field>
          <Field label="Nomor urut" htmlFor="add-number" help="Harus unik antar paslon."><input id="add-number" type="number" className="form-control" name="electionNumber" min="1" required /></Field>
          <Field label="Instagram" htmlFor="add-ig" help="Tanpa @."><input id="add-ig" type="text" className="form-control" name="instagram" placeholder="@username" /></Field>
        </div>
        <Field label="Visi" htmlFor="add-vision" help="Ringkas, satu sampai dua kalimat."><textarea id="add-vision" className="form-control" name="vision" rows="2" required /></Field>
        <Field label="Misi" htmlFor="add-mission" help="Satu poin per baris."><textarea id="add-mission" className="form-control" name="mission" rows="3" required /></Field>
        <div className="form-grid">
          <UploadField name="photoUrl" kind="photo" label="Foto paslon" />
          <UploadField name="cvUrl" kind="cv" label="CV (PDF)" />
        </div>
      </ModalForm>

      {candidates.map((c) => (
        <ModalForm key={c.id} id={`editCandidate${c.id}`} title="Edit kandidat" action={saveCandidate} submit="Simpan perubahan">
          <input type="hidden" name="id" value={c.id} />
          <div className="form-grid">
            <Field label="Nama ketua" htmlFor={`ec-${c.id}-leader`}><input id={`ec-${c.id}-leader`} type="text" className="form-control" name="leaderName" defaultValue={c.leaderName} required /></Field>
            <Field label="Nama wakil" htmlFor={`ec-${c.id}-vice`}><input id={`ec-${c.id}-vice`} type="text" className="form-control" name="viceName" defaultValue={c.viceName} required /></Field>
            <Field label="Nomor urut" htmlFor={`ec-${c.id}-number`}><input id={`ec-${c.id}-number`} type="number" className="form-control" name="electionNumber" min="1" defaultValue={c.electionNumber} required /></Field>
            <Field label="Instagram" htmlFor={`ec-${c.id}-ig`} help="Tanpa @."><input id={`ec-${c.id}-ig`} type="text" className="form-control" name="instagram" defaultValue={c.instagram ?? ""} placeholder="@username" /></Field>
          </div>
          <Field label="Visi" htmlFor={`ec-${c.id}-vision`} help="Ringkas, satu sampai dua kalimat."><textarea id={`ec-${c.id}-vision`} className="form-control" name="vision" rows="2" defaultValue={c.vision} required /></Field>
          <Field label="Misi" htmlFor={`ec-${c.id}-mission`} help="Satu poin per baris."><textarea id={`ec-${c.id}-mission`} className="form-control" name="mission" rows="3" defaultValue={c.mission} required /></Field>
          <div className="form-grid">
            <UploadField name="photoUrl" kind="photo" label="Foto paslon" initial={c.photoUrl} />
            <UploadField name="cvUrl" kind="cv" label="CV (PDF)" initial={c.cvUrl} />
          </div>
        </ModalForm>
      ))}
    </>
  );
}
