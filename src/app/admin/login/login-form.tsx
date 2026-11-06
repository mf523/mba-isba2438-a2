"use client";

import { useActionState, useRef } from "react";
import { login } from "./actions";
import { initialLoginFormState } from "./login-state";

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    login,
    initialLoginFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction}>
      {state.error ? (
        <p className="form-feedback form-feedback-error" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="field-group">
        <label htmlFor="password">Admin password</label>
        <input id="password" name="password" type="password" required />
      </div>
      <button className="submit-button" type="submit" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
