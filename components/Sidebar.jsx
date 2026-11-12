"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const groups = [
  { label: null, items: [{ href: "/dashboard", icon: "fa-chart-pie", label: "Dashboard" }] },
  {
    label: "Data pemilihan",
    items: [
      { href: "/dashboard/kandidat", icon: "fa-users", label: "Kandidat" },
      { href: "/dashboard/pemilih", icon: "fa-id-card", label: "Pemilih" },
    ],
  },
  {
    label: "Pengaturan",
    items: [
      { href: "/dashboard/admin", icon: "fa-user-shield", label: "Admin" },
      { href: "/dashboard/jadwal", icon: "fa-clock", label: "Jadwal" },
    ],
  },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="admin-sidebar" id="accordionSidebar">
      <Link className="admin-brand" href="/dashboard" aria-label="Dashboard PEMIRA">
        <img src="/assets/img/pemira-logo.webp" alt="Logo Pemilihan Raya" width="32" height="38" />
        <span>
          <strong>PEMIRA</strong>
          <small>Admin panel</small>
        </span>
      </Link>

      <nav className="admin-nav" aria-label="Navigasi admin">
        {groups.map((g, gi) => (
          <div className="admin-nav-group" key={gi}>
            {g.label && <div className="admin-nav-label">{g.label}</div>}
            {g.items.map((it) => (
              <Link key={it.href} href={it.href} aria-current={path === it.href ? "page" : undefined}>
                <i className={`fas ${it.icon}`} aria-hidden="true" />
                {it.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

    </aside>
  );
}
