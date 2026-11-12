"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// The shipped SB Admin rail stays visible on phones and squeezes the content to
// ~286px. Turn it into an off-canvas drawer with a scrim instead.
export default function MobileSidebarToggle() {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    document.body.classList.toggle("sidebar-open", open);
    return () => document.body.classList.remove("sidebar-open");
  }, [open]);

  return (
    <>
      <button
        id="sidebarToggleTop"
        type="button"
        className="topbar-menu-btn d-md-none mr-3"
        aria-label={open ? "Tutup menu" : "Buka menu"}
        aria-expanded={open}
        aria-controls="accordionSidebar"
        onClick={() => setOpen((v) => !v)}
      >
        <i className="fa fa-bars" />
      </button>
      {open && <button type="button" className="sidebar-scrim" aria-label="Tutup menu" onClick={() => setOpen(false)} />}
    </>
  );
}
