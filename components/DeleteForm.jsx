"use client";
import { useActionState } from "react";

// Confirm + submit in one; surfaces the server action's refusal (e.g. candidate
// already has votes, or deleting your own account) instead of failing silently.
export default function DeleteForm({ action, id, label, message = "Hapus data ini?", className = "icon-btn icon-btn--danger" }) {
  const [state, formAction, pending] = useActionState((_, formData) => action(formData), {});
  return (
    <form
      action={formAction}
      onSubmit={(e) => { if (!window.confirm(message)) e.preventDefault(); }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={className} aria-label={label} title={label} disabled={pending} aria-busy={pending}>
        <i className="fas fa-trash" />
      </button>
      {state?.error && <div className="alert alert-danger py-2 px-2 mt-2 mb-0 small" role="alert">{state.error}</div>}
    </form>
  );
}
