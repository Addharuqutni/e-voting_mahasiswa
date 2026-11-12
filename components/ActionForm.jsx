"use client";
import { useActionState, useRef, useEffect } from "react";
import Spinner from "./Spinner";

// Form with inline validation feedback, focus moved to the error, and a spinner
// in the button. `confirm` gates the submit behind a native confirm when the
// change is risky (e.g. editing a live schedule).
export default function ActionForm({ action, children, submit = "Save", submitClass = "btn-pilih", confirm }) {
  // useActionState calls action(prevState, formData); adapt to the (formData) actions here.
  const [state, formAction, pending] = useActionState((_, formData) => action(formData), {});
  const errRef = useRef(null);

  useEffect(() => {
    if (state?.error && errRef.current) errRef.current.focus();
  }, [state?.error]);

  return (
    <form
      action={formAction}
      onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}
    >
      {children}
      {state?.error && (
        <div className="alert alert-danger" role="alert" tabIndex={-1} ref={errRef}>
          {state.error}
        </div>
      )}
      {state?.ok && <div className="alert alert-success" role="status">{state.ok}</div>}
      <button type="submit" className={submitClass} disabled={pending} aria-busy={pending}>
        {pending && <Spinner />}
        {pending ? "Menyimpan..." : submit}
      </button>
    </form>
  );
}
