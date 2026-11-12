import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AdminLayout({ children }) {
  return (
    <div id="wrapper" className="admin-shell">
      <Sidebar />
      <div id="content-wrapper" className="d-flex flex-column">
        <div id="content">
          <Topbar admin />
          <div className="container-fluid">{children}</div>
        </div>
        <footer className="sticky-footer">
          <div className="copyright">© {new Date().getFullYear()} · Pemilihan Raya Mahasiswa Teknik Telekomunikasi</div>
        </footer>
      </div>
    </div>
  );
}
