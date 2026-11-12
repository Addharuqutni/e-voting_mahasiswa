import Script from "next/script";
import ModalResidueCleanup from "@/components/ModalResidueCleanup";

export const metadata = { title: "PEMIRA HMIF", description: "An e-voting application." };

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <link rel="preload" href="/fonts/nunito-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link href="/template/vendor/fontawesome-free/css/all.min.css" rel="stylesheet" />
        <link href="/template/css/sb-admin-2.min.css" rel="stylesheet" />
        <link href="/app.css" rel="stylesheet" />
      </head>
      <body id="page-top">
        <ModalResidueCleanup />
        {children}
      </body>
    </html>
  );
}
