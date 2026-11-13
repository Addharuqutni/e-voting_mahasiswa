"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Status Jadwal dihitung di server, jadi halaman yang sudah terbuka tidak tahu
// waktu buka/tutup sudah tiba. Tarik ulang berkala (bukan reload penuh): state
// klien, posisi scroll, dan isian form tetap. Tab tersembunyi dilewati supaya
// tidak menambah beban VPS.
export default function AutoRefresh({ seconds = 15 }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
