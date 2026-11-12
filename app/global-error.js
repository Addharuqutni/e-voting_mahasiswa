"use client";

// Last-resort boundary: replaces the whole document, so it must ship its own
// html/body and inline styles.
export default function GlobalError({ error, reset }) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f5f6fa",
          color: "#1b2333",
          fontFamily: "Nunito, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div style={{ maxWidth: 420, padding: 32, textAlign: "center" }}>
          <h1 style={{ margin: "0 0 8px", fontSize: "1.5rem" }}>Sistem sedang bermasalah</h1>
          <p style={{ margin: "0 0 20px", color: "#59637a", fontSize: ".92rem", lineHeight: 1.6 }}>
            Permintaan Anda gagal diproses. Silakan coba beberapa saat lagi.
          </p>
          {error?.digest && <p style={{ margin: "0 0 16px", fontSize: ".76rem", color: "#6b7280" }}>Kode: {error.digest}</p>}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: 0, borderRadius: 10, background: "#3b5bdb", color: "#fff",
              padding: "12px 20px", fontWeight: 700, cursor: "pointer",
            }}
          >
            Muat ulang
          </button>
        </div>
      </body>
    </html>
  );
}
