"use client";
import { useRef, useState, useTransition } from "react";
import { castVoteAction } from "@/app/actions";
import Spinner from "./Spinner";
import Countdown from "./Countdown";
import { voteTimeoutAction } from "@/app/actions";

const dtf = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fmt = (v) => (v ? dtf.format(new Date(v)) : "—");

function Schedule({ startTime, endTime }) {
  if (!startTime || !endTime) return "Belum dijadwalkan";
  const d = new Date(startTime), e = new Date(endTime);
  const day = (x) => x.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const time = (x) => x.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return day(d) === day(e) ? `${day(d)}, ${time(d)} – ${time(e)} WIB` : `${day(d)} ${time(d)} – ${day(e)} ${time(e)} WIB`;
}

function InstagramLink({ handle }) {
  if (!handle) return null;
  return (
    <a className="paslon-ig" href={`https://instagram.com/${encodeURIComponent(handle)}`} target="_blank" rel="noopener noreferrer">
      <i className="fab fa-instagram" aria-hidden="true" /> @{handle}
    </a>
  );
}

export default function Ballot({ candidates, user, startTime, endTime, deadline, secondsLeft, limitMinutes, booth }) {
  const [picked, setPicked] = useState(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const dlg = useRef(null);

  function pick(candidate) {
    setPicked(candidate);
    setError("");
    dlg.current?.showModal();
  }

  function close() {
    if (!pending) dlg.current?.close();
  }

  function submit() {
    start(async () => {
      const res = await castVoteAction(picked.id);
      if (res?.error) setError(res.error);
    });
  }

  function onCancel(event) {
    if (pending) event.preventDefault();
  }

  return (
    <div className="ballot-wrap">
      <header className="ballot-hero" aria-labelledby="ballot-title">
        <h1 id="ballot-title">Pemilihan Raya</h1>
        <p>Mahasiswa Teknik Telekomunikasi</p>
      </header>

      <div className="ballot-meta">
        <span className="meta-item">
          <span className="status-dot" aria-hidden="true" />
          <strong>Giliran Anda — pilih dalam {limitMinutes} menit</strong>
          <Countdown seconds={secondsLeft} onExpire={voteTimeoutAction} />
        </span>
      </div>

      <div className="booth-note">
        <span className="meta-item">
          <i className="far fa-clock" aria-hidden="true" />
          Jadwal: {Schedule({ startTime, endTime })}
        </span>
        {booth && <span className="meta-item">Bilik terisi {booth.inBooth}/{booth.slots} · antrean {booth.waiting}</span>}
      </div>

      <div className="paslon-grid-v2">
        {candidates.map((c) => (
          <article className={`paslon-card-v2${c.photoUrl ? "" : " is-textonly"}`} key={c.id} aria-labelledby={`paslon-${c.id}`}>
            <div className="paslon-media">
              {c.photoUrl ? (
                <img src={c.photoUrl} alt={`Foto Paslon ${c.electionNumber}: ${c.leaderName} dan ${c.viceName}`} loading="lazy" />
              ) : (
                <span className="paslon-no-stamp" aria-hidden="true">{String(c.electionNumber).padStart(2, "0")}</span>
              )}
              {c.photoUrl && (
                <span className="paslon-badge" aria-label={`Nomor urut ${c.electionNumber}`}>{c.electionNumber}</span>
              )}
              <span className="paslon-poster-label">Paslon Nomor Urut {c.electionNumber}</span>
            </div>

            <div className="paslon-body">
              <h2 id={`paslon-${c.id}`}>{c.leaderName} &ndash; {c.viceName}</h2>

              <span className="paslon-label">Visi</span>
              <p>{c.vision}</p>

              <span className="paslon-label">Misi</span>
              <ol className="paslon-misi">
                {String(c.mission ?? "").split(/\r?\n/).filter(Boolean).map((line, i) => <li key={i}>{line}</li>)}
              </ol>

              <InstagramLink handle={c.instagram} />

              <div className="paslon-actions">
                {c.cvUrl ? (
                  <a className="btn-outline" href={`/api/cv/${c.id}`} target="_blank" rel="noopener noreferrer">
                    <i className="far fa-file-alt" aria-hidden="true" /> CV
                  </a>
                ) : (
                  <button className="btn-outline" type="button" disabled><i className="far fa-file-alt" aria-hidden="true" /> CV</button>
                )}
                <button className="btn-pilih" type="button" onClick={() => pick(c)}>
                  Pilih <i className="fas fa-check" aria-hidden="true" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* ponytail: native <dialog> covers focus trap + Escape; upgrade to a portal if nested modals are needed. */}
      <dialog
        id="confirmVoteModal"
        className="vote-dialog"
        ref={dlg}
        aria-labelledby="confirmVoteLabel"
        onCancel={onCancel}
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="confirmVoteLabel">Konfirmasi pilihan</h5>
              <button type="button" className="close" aria-label="Close" onClick={close} disabled={pending}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <p className="mb-3">
                Apakah Anda yakin memilih <strong>Paslon {picked?.electionNumber} — {picked?.leaderName} &amp; {picked?.viceName}</strong>?
              </p>
              <p className="small text-muted mb-0">Suara yang sudah dikirim tidak dapat diubah atau dibatalkan.</p>
              {error && <div className="alert alert-danger mt-3 mb-0" role="alert">{error}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-outline" onClick={close} disabled={pending}>Batal</button>
              <button type="button" className="btn-pilih" onClick={submit} disabled={pending || !picked} aria-busy={pending}>
                {pending && <Spinner />}
                {pending ? "Mengirim..." : "Ya, kirim suara"}
              </button>
            </div>
          </div>
        </div>
      </dialog>

      <p className="ballot-foot">
        Satu pemilih, satu suara · Pilihan Anda bersifat rahasia
      </p>
    </div>
  );
}
