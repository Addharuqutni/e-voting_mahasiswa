"use client";
import { useEffect, useState } from "react";

// Sisa waktu bilik suara. Saat habis, server dipanggil untuk logout paksa.
const two = (n) => String(n).padStart(2, "0");

export default function Countdown({ seconds, onExpire }) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    setLeft(seconds);
    if (seconds <= 0) return;
    const id = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  useEffect(() => {
    if (left === 0) onExpire?.();
  }, [left, onExpire]);

  const low = left <= 60;
  return (
    <span className={`countdown${low ? " is-low" : ""}`} role="timer" aria-live="off" aria-label={`Sisa waktu ${Math.floor(left / 60)} menit ${left % 60} detik`}>
      <i className="fas fa-stopwatch" aria-hidden="true" />
      {two(Math.floor(left / 60))}:{two(left % 60)}
    </span>
  );
}
