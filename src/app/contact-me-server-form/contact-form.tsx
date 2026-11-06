"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitContact } from "./actions";
import { initialContactFormState } from "./form-state";

export default function ContactForm() {
  const [state, formAction, isPending] = useActionState(
    submitContact,
    initialContactFormState,
  );
  const [dismissedThrough, setDismissedThrough] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }
    formRef.current?.reset();
    const timer = setTimeout(
      () => setDismissedThrough(state.sequence),
      5000,
    );
    return () => clearTimeout(timer);
  }, [state]);

  const showSuccess =
    state.status === "success" && state.sequence > dismissedThrough;

  return (
    <form ref={formRef} action={formAction} noValidate>
      {showSuccess ? (
        <p
          key={state.sequence}
          className="form-feedback form-feedback-success feedback-autohide"
          role="status"
          aria-live="polite"
        >
          {state.message}
        </p>
      ) : null}
      {state.status === "error" ? (
        <p
          className="form-feedback form-feedback-error"
          role="alert"
          aria-live="polite"
        >
          {state.message}
        </p>
      ) : null}
      <div className="field-group">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          type="text"
          aria-invalid={state.fieldErrors.name ? true : undefined}
          aria-describedby={state.fieldErrors.name ? "name-error" : undefined}
        />
        {state.fieldErrors.name ? (
          <p className="field-error" id="name-error">
            {state.fieldErrors.name}
          </p>
        ) : null}
      </div>
      <div className="field-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          aria-invalid={state.fieldErrors.email ? true : undefined}
          aria-describedby={
            state.fieldErrors.email ? "email-error" : undefined
          }
        />
        {state.fieldErrors.email ? (
          <p className="field-error" id="email-error">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>
      <div className="field-group">
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          name="message"
          rows={5}
          aria-invalid={state.fieldErrors.message ? true : undefined}
          aria-describedby={
            state.fieldErrors.message ? "message-error" : undefined
          }
        />
        {state.fieldErrors.message ? (
          <p className="field-error" id="message-error">
            {state.fieldErrors.message}
          </p>
        ) : null}
      </div>
      <button className="submit-button" type="submit" disabled={isPending}>
        {isPending ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
