"use client";

// Route-level error boundary: keeps a crash on one page from showing a blank
// screen or leaking a stack trace to voters.
export default function Error({ error, reset }) {
  return (
    <main className="login-page">
      <section className="login-card" role="alert">
        <h1>Terjadi kesalahan</h1>
        <p className="login-sub">
          Halaman ini gagal dimuat. Data suara Anda tetap aman — coba muat ulang atau kembali ke beranda.
        </p>
        {error?.digest && <p className="small" style={{ color: "var(--ui-ink-soft)" }}>Kode rujukan: {error.digest}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn-pilih" onClick={() => reset()}>Coba lagi</button>
          <a className="btn-outline" href="/">Kembali ke beranda</a>
        </div>
      </section>
    </main>
  );
}
