"use client";
import { useActionState } from "react";
import Spinner from "./Spinner";
import { toggleVoting } from "@/app/actions";

// Destructive-ish state change: the label says what will happen, the button
// reports busy, and the outcome is announced (role=status) after it resolves.
export default function ToggleVoting({ open }) {
  const [state, formAction, pending] = useActionState(toggleVoting, {});
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (open && !window.confirm("Tutup pemungutan suara sekarang? Pemilih tidak dapat mengirim suara setelah ini.")) e.preventDefault();
      }}
    >
      <button type="submit" className={open ? "btn-stop" : "btn-pilih"} disabled={pending} aria-busy={pending}>
        {pending && <Spinner />}
        {pending ? "Memproses..." : open ? "Tutup pemungutan suara" : "Buka pemungutan suara"}
      </button>
      {state?.error && <div className="alert alert-danger mt-3 mb-0" role="alert">{state.error}</div>}
      {state?.ok && <div className="alert alert-success mt-3 mb-0" role="status">{state.ok}</div>}
    </form>
  );
}
