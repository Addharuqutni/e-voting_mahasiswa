"use client";
import { useEffect, useRef } from "react";

const palette = ["#4e73df", "#1cc88a", "#36b9cc", "#f6c23e", "#e74a3b", "#858796"];

// Mirrors template/js/demo/chart-bar-demo.js (Chart.js v2) from the original repo.
export default function BarChart({ data }) {
  const ref = useRef(null);

  useEffect(() => {
    let chart;
    let timer;
    // Chart.js dimuat per halaman (ChartLoader) -> tunggu sampai tersedia.
    const draw = () => {
      // Chart.js bisa sudah terdefinisi tapi belum selesai diinisialisasi
      if (!window.Chart?.defaults || !ref.current) return false;
      window.Chart.defaults.global.defaultFontFamily =
        'Nunito, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
      window.Chart.defaults.global.defaultFontColor = "#4b5263";
      const labels = Object.keys(data).map((k) => `Paslon ${k}`);
      chart = new window.Chart(ref.current, {
        type: "bar",
        data: {
          labels,
          datasets: [{ label: "Suara Paslon: ", backgroundColor: labels.map((_, i) => palette[i % palette.length]), data: Object.values(data) }],
        },
        options: {
          maintainAspectRatio: false,
          layout: { padding: { left: 10, right: 25, top: 25, bottom: 0 } },
          scales: {
            xAxes: [{ gridLines: { display: false, drawBorder: false }, ticks: { maxTicksLimit: labels.length || 1 }, maxBarThickness: 25 }],
            yAxes: [{ ticks: { min: 0, stepSize: 1, suggestedMax: Math.max(1, Object.values(data).reduce((a, b) => a + b, 0)), maxTicksLimit: 5, padding: 10 }, gridLines: { color: "rgb(234, 236, 244)", zeroLineColor: "rgb(234, 236, 244)", drawBorder: false, borderDash: [2], zeroLineBorderDash: [2] } }],
          },
          legend: { display: false },
          tooltips: { backgroundColor: "rgb(255,255,255)", bodyFontColor: "#858796", borderColor: "#dddfeb", borderWidth: 1, xPadding: 15, yPadding: 15, displayColors: false, caretPadding: 10 },
        },
      });
      return true;
    };
    if (!draw()) timer = setInterval(() => { if (draw()) clearInterval(timer); }, 200);
    return () => {
      clearInterval(timer);
      chart?.destroy();
    };
  }, [data]);

  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const summary = Object.entries(data)
    .map(([label, value]) => `Paslon ${label}: ${value} suara${total ? ` (${Math.round((value / total) * 1000) / 10}%)` : ""}`)
    .join(", ");

  return (
    <div className="chart-bar" style={{ position: "relative", height: 320 }}>
      <canvas ref={ref} role="img" aria-label={`Grafik perolehan suara. ${summary || "Belum ada suara."}`} />
      <p className="sr-only">{summary || "Belum ada suara."}</p>
      <table className="table table-sm table-borderless mb-0 mt-3 sr-only">
        <caption className="sr-only">Rekapitulasi perolehan suara per paslon</caption>
        <thead><tr><th scope="col">Paslon</th><th scope="col">Suara</th></tr></thead>
        <tbody>
          {Object.entries(data).map(([label, value]) => (
            <tr key={label}><td>Paslon {label}</td><td>{value}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
