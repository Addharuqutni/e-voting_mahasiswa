"use client";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/actions";

const initials = (name) =>
  String(name ?? "").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

// Dropdown + konfirmasi logout tanpa jQuery/Bootstrap, supaya halaman pemilih
// tidak perlu memuat vendor JS itu.
export default function UserMenu({ name, role }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const dlg = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="user-menu" ref={wrap}>
      <button
        type="button"
        className="user-menu-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="topbar-avatar" aria-hidden="true">{initials(name)}</span>
        <span className="user-menu-name">Hai, {name} ({role})</span>
      </button>

      {open && (
        <div className="user-menu-panel" role="menu">
          <button
            type="button"
            className="user-menu-item"
            role="menuitem"
            onClick={() => { setOpen(false); dlg.current?.showModal(); }}
          >
            <i className="fas fa-sign-out-alt" aria-hidden="true" /> Logout
          </button>
        </div>
      )}

      <dialog className="vote-dialog" ref={dlg} aria-labelledby="logoutLabel">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="logoutLabel">Anda yakin ingin keluar?</h5>
            <button type="button" className="close" onClick={() => dlg.current?.close()} aria-label="Tutup">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">Pilih &quot;Keluar&quot; di bawah ini jika anda siap untuk mengakhiri sesi Anda saat ini.</div>
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={() => dlg.current?.close()}>Batal</button>
            <form action={logoutAction}>
              <button type="submit" className="btn-pilih">Keluar</button>
            </form>
          </div>
        </div>
      </dialog>
    </div>
  );
}
