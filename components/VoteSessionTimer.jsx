"use client";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/actions";

// Sesi pemilih yang sudah memilih otomatis logout 1 menit setelah votedAt.
// Server juga menolak sesi lewat batas, jadi ini hanya UX (tampilan + cookie).
const pad = (n) => String(n).padStart(2, "0");

export default function VoteSessionTimer({ seconds }) {
  const [left, setLeft] = useState(seconds);
  const done = useRef(false);

  useEffect(() => {
    setLeft(seconds);
    done.current = false;
    if (seconds <= 0) {
      done.current = true;
      logoutAction();
      return;
    }
    const id = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  useEffect(() => {
    if (left === 0 && !done.current) {
      done.current = true;
      logoutAction();
    }
  }, [left]);

  return (
    <span className="countdown" role="timer" aria-label={`Sesi berakhir dalam ${left} detik`}>
      <i className="fas fa-stopwatch" aria-hidden="true" />
      {pad(Math.floor(left / 60))}:{pad(left % 60)}
    </span>
  );
}
