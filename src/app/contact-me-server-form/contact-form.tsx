"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Field from "@/components/field";
import TextareaField from "@/components/textarea-field";
import { submitContact } from "./actions";
import { initialContactFormState } from "./form-state";

const SUCCESS_VISIBLE_MS = 5000;
const FADE_MS = 500;

export default function ContactForm() {
  const [state, formAction, isPending] = useActionState(
    submitContact,
    initialContactFormState,
  );
  const [fadingThrough, setFadingThrough] = useState(0);
  const [dismissedThrough, setDismissedThrough] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }
    formRef.current?.reset();
    const fadeTimer = setTimeout(
      () => setFadingThrough(state.sequence),
      SUCCESS_VISIBLE_MS,
    );
    const dismissTimer = setTimeout(
      () => setDismissedThrough(state.sequence),
      SUCCESS_VISIBLE_MS + FADE_MS,
    );
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [state]);

  const showSuccess =
    state.status === "success" && state.sequence > dismissedThrough;
  const isFading = showSuccess && state.sequence <= fadingThrough;

  return (
    <form ref={formRef} action={formAction} noValidate>
      {showSuccess ? (
        <p
          key={state.sequence}
          className={`form-feedback form-feedback-success${isFading ? " feedback-fading" : ""}`}
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
      <Field
        id="name"
        name="name"
        label="Name"
        error={state.fieldErrors.name}
      />
      <Field
        id="email"
        name="email"
        label="Email"
        type="email"
        error={state.fieldErrors.email}
      />
      <TextareaField
        id="message"
        name="message"
        label="Message"
        rows={5}
        error={state.fieldErrors.message}
      />
      <button className="submit-button" type="submit" disabled={isPending}>
        {isPending ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
