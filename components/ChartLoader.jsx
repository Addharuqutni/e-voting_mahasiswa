import Script from "next/script";

// Chart.js hanya dimuat di halaman yang benar-benar memakai grafik
// (dashboard admin + halaman hasil) — bukan di seluruh aplikasi.
export default function ChartLoader() {
  return <Script src="/template/vendor/chart.js/Chart.min.js" strategy="lazyOnload" />;
}
