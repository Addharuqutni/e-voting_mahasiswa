import Topbar from "./Topbar";

export default function VoterLayout({ children }) {
  return (
    <div id="wrapper" className="voter-shell">
      <div id="content-wrapper" className="d-flex flex-column">
        <div id="content">
          <Topbar />
          {children}
        </div>
        <footer className="sticky-footer bg-light">
          <div className="container my-auto">
            <div className="copyright text-center my-auto">
              <span className="text-dark">© {new Date().getFullYear()} · Pemilihan Raya Mahasiswa Teknik Telekomunikasi</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
