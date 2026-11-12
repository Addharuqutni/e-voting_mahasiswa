"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import Spinner from "./Spinner";
import { loginAction } from "@/app/actions";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, {});
  const [showPw, setShowPw] = useState(false);
  const errRef = useRef(null);

  // Move focus to the alert so screen readers announce it (rule: error summary validation).
  useEffect(() => {
    if (state.error && errRef.current) errRef.current.focus();
  }, [state.error]);

  const invalid = Boolean(state.error);

  return (
    <form className="login-form" action={formAction} noValidate>
      {state.error && (
        <div className="alert alert-danger" id="login-error" role="alert" tabIndex={-1} ref={errRef}>
          {state.error}
        </div>
      )}

      <div className="field">
        <label htmlFor="email">Email atau NIM</label>
        <input
          type="text"
          name="email"
          id="email"
          autoComplete="username"
          enterKeyHint="next"
          placeholder="nama@student.ac.id atau NIM"
          aria-invalid={invalid}
          aria-describedby={invalid ? "login-error" : undefined}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <div className="field-pw">
          <input
            type={showPw ? "text" : "password"}
            name="password"
            id="password"
            autoComplete="current-password"
            enterKeyHint="go"
            aria-invalid={invalid}
            aria-describedby={invalid ? "login-error" : undefined}
            required
          />
          <button
            type="button"
            className="pw-toggle"
            aria-pressed={showPw}
            aria-label={showPw ? "Sembunyikan password" : "Tampilkan password"}
            onClick={() => setShowPw((v) => !v)}
          >
            <i className="far fa-eye" aria-hidden="true" />
            <i className="far fa-eye-slash" aria-hidden="true" />
          </button>
        </div>
      </div>

      <button type="submit" className="btn-masuk" disabled={pending} aria-busy={pending}>
        {pending && <Spinner />}
        {pending ? "Memeriksa..." : "Masuk"}
      </button>
    </form>
  );
}
