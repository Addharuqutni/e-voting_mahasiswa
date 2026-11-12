"use client";
import { useState } from "react";
import Script from "next/script";

// Vendor JS hanya untuk halaman admin, dimuat berurutan (jQuery -> Bootstrap ->
// DataTables -> integrasi bootstrap4) supaya tidak ada race "jQuery is not defined".
export default function AdminVendorScripts() {
  const [jqueryReady, setJqueryReady] = useState(false);
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [coreReady, setCoreReady] = useState(false);

  return (
    <>
      <link href="/template/vendor/datatables/dataTables.bootstrap4.min.css" rel="stylesheet" />
      <Script
        src="/template/vendor/jquery/jquery.min.js"
        strategy="afterInteractive"
        onLoad={() => setJqueryReady(true)}
      />
      {jqueryReady && (
        <Script
          src="/template/vendor/bootstrap/js/bootstrap.bundle.min.js"
          strategy="afterInteractive"
          onLoad={() => setBootstrapReady(true)}
        />
      )}
      {bootstrapReady && (
        <Script
          src="/template/vendor/datatables/jquery.dataTables.min.js"
          strategy="afterInteractive"
          onLoad={() => setCoreReady(true)}
        />
      )}
      {coreReady && (
        <Script src="/template/vendor/datatables/dataTables.bootstrap4.min.js" strategy="afterInteractive" />
      )}
    </>
  );
}
