"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Bootstrap modals append a backdrop to <body> and lock scrolling. A server
// redirect (logout) never runs Bootstrap's hide callback, so the next page lands
// under a dead overlay. Clear the residue on every route change.
export default function ModalResidueCleanup() {
  const pathname = usePathname();
  useEffect(() => {
    document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());
    document.body.classList.remove("modal-open", "sidebar-open");
    document.body.style.removeProperty("padding-right");
  }, [pathname]);
  return null;
}
