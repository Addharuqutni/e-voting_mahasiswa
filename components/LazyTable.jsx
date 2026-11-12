"use client";
import { useEffect, useRef } from "react";

// Runs the repo's own DataTables init on the rendered table.
// jQuery/DataTables arrive via next/script (afterInteractive), so wait for them.
export default function LazyTable({ children }) {
  const ref = useRef(null);
  useEffect(() => {
    let timer;
    const init = () => {
      const $ = window.jQuery;
      if (!$?.fn?.dataTable || !ref.current) return false;
      const table = $(ref.current).find("table").first();
      if (table.length && !$.fn.dataTable.isDataTable(table))
        table.DataTable({
          pageLength: 25,
          autoWidth: false,
          language: {
            emptyTable: "Belum ada data.",
            zeroRecords: "Tidak ada data yang cocok.",
            info: "Menampilkan _START_–_END_ dari _TOTAL_ data",
            infoEmpty: "Tidak ada data",
            infoFiltered: "(difilter dari _MAX_ data)",
            lengthMenu: "Tampilkan _MENU_ data",
            search: "Cari",
            paginate: { previous: "Sebelumnya", next: "Berikutnya" },
          },
          drawCallback() {
            const info = this.api().page.info();
            const wrap = $(this.api().table().container());
            wrap.find(".pagination").toggle(info.pages > 1);
            wrap.find(".dataTables_info").toggle(info.recordsTotal > 0);
          },
        });
      return true;
    };
    if (!init()) timer = setInterval(() => { if (init()) clearInterval(timer); }, 200);
    return () => clearInterval(timer);
  }, []);
  return <div ref={ref}>{children}</div>;
}
