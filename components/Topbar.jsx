import Link from "next/link";
import { getSessionUser } from "@/lib/guard";
import { logoutAction } from "@/app/actions";
import MobileSidebarToggle from "./MobileSidebarToggle";
import UserMenu from "./UserMenu";

const displayName = (name) => String(name ?? "").trim();

export default async function Topbar({ admin = false }) {
  const user = await getSessionUser();

  if (admin) {
    const name = displayName(user?.name) || "Admin";
    const initials = name.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
    return (
      <nav className="admin-topbar">
        <MobileSidebarToggle />
        <div className="topbar-user">
          <span className="topbar-avatar" aria-hidden="true">{initials}</span>
          <div>
            <strong>{name}</strong>
            <small>Administrator</small>
          </div>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="btn-outline topbar-logout">
            <i className="fas fa-sign-out-alt" aria-hidden="true" /> Keluar
          </button>
        </form>
      </nav>
    );
  }
  return (
    <>
      <nav className="navbar navbar-expand navbar-light bg-white topbar mb-4 static-top shadow">
        <Link className="navbar-brand" href={user ? (user.role === "ADMIN" ? "/dashboard" : "/milih") : "/"}>
          <img src="/assets/img/logo-kampus.webp" alt="Telkom University Purwokerto" className="topbar-campus-logo" width="73" height="30" fetchPriority="high" />
          <img src="/assets/img/logo-jurusan.webp" alt="Sarjana Teknik Telekomunikasi" className="topbar-jurusan-logo" width="139" height="26" />
          <img src="/assets/img/pemira-logo.webp" alt="Logo Pemilihan Raya" className="topbar-emblem-logo" width="27" height="32" />
        </Link>
        <MobileSidebarToggle />

        <ul className="navbar-nav ml-auto">
          <li className="nav-item">
            <a className="nav-link" href="https://www.instagram.com/hmtt_telupwt/" target="_blank" rel="noopener noreferrer" aria-label="Instagram HMTT">
              <i className="fab fa-instagram" />
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link" href="https://bte-pwt.telkomuniversity.ac.id/" target="_blank" rel="noopener noreferrer" aria-label="Website BTE">
              <i className="fas fa-globe" />
            </a>
          </li>
          {user ? (
            <UserMenu name={displayName(user.name)} role={user.role === "ADMIN" ? "Admin" : "Voter"} />
          ) : (
            <li className="nav-item">
              <Link className="nav-link" href="/">Masuk</Link>
            </li>
          )}
        </ul>
      </nav>

      <a className="scroll-to-top rounded" href="#page-top" aria-label="Scroll to top">
        <i className="fas fa-angle-up" />
      </a>


    </>
  );
}
