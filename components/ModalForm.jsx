"use client";
import { useActionState, useEffect, useRef } from "react";
import Spinner from "./Spinner";

// Bootstrap 4 modal + server action. Closes itself on success and shows a spinner
// while the action is in flight (the button also reports aria-busy).
export default function ModalForm({ id, title, action, submit = "Simpan", submitClass = "btn-pilih", children }) {
  // useActionState calls action(prevState, formData); adapt to the (formData) actions here.
  const [state, formAction, pending] = useActionState((_, formData) => action(formData), {});
  const ref = useRef(null);

  useEffect(() => {
    if (state?.ok && ref.current && window.jQuery) window.jQuery(ref.current).modal("hide");
  }, [state?.ok]);

  return (
    <div className="modal fade" id={id} tabIndex={-1} aria-labelledby={`${id}Label`} aria-hidden="true" data-backdrop="static" ref={ref}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id={`${id}Label`}>{title}</h5>
            <button type="button" className="close" data-dismiss="modal" aria-label="Tutup">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <form action={formAction} aria-describedby={state?.error ? `${id}-error` : undefined}>
            <div className="modal-body">
              {children}
              {state?.error && (
                <div className="alert alert-danger mb-0 mt-3" id={`${id}-error`} role="alert">
                  {state.error}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-outline" data-dismiss="modal">Batal</button>
              <button type="submit" className={submitClass} disabled={pending} aria-busy={pending}>
                {pending && <Spinner />}
                {pending ? "Menyimpan..." : submit}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
