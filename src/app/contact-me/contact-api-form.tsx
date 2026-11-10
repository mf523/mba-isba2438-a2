"use client";

import { useRef, useState } from "react";
import type { ContactFieldErrors } from "@/lib/contact-submissions";

interface ApiFormState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: ContactFieldErrors;
}

const initial: ApiFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};

export default function ContactApiForm() {
  const [state, setState] = useState<ApiFormState>(initial);
  const [isPending, setIsPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = formRef.current;
    if (!form) {
      return;
    }
    const data = new FormData(form);
    setIsPending(true);
    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          message: data.get("message"),
        }),
      });
      const result = await response.json();
      if (response.status === 201 && result.ok) {
        form.reset();
        setState({
          status: "success",
          message: "Your message has been sent. Thank you!",
          fieldErrors: {},
        });
      } else if (result.fieldErrors) {
        setState({
          status: "error",
          message: "Please fix the highlighted fields and try again.",
          fieldErrors: result.fieldErrors,
        });
      } else {
        setState({
          status: "error",
          message: result.message ?? "Something went wrong. Please try again.",
          fieldErrors: {},
        });
      }
    } catch {
      setState({
        status: "error",
        message: "Could not reach the server. Please try again.",
        fieldErrors: {},
      });
    } finally {
      setIsPending(false);
    }
  }

  const field = (name: keyof ContactFieldErrors, id: string) => ({
    "aria-invalid": state.fieldErrors[name] ? true : undefined,
    "aria-describedby": state.fieldErrors[name] ? `${id}-error` : undefined,
  });
  const error = (name: keyof ContactFieldErrors, id: string) =>
    state.fieldErrors[name] ? (
      <p className="field-error" id={`${id}-error`}>
        {state.fieldErrors[name]}
      </p>
    ) : null;

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      {state.status === "success" ? (
        <p
          className="form-feedback form-feedback-success"
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
        <label htmlFor="api-name">Name</label>
        <input
          id="api-name"
          name="name"
          type="text"
          {...field("name", "api-name")}
        />
        {error("name", "api-name")}
      </div>
      <div className="field-group">
        <label htmlFor="api-email">Email</label>
        <input
          id="api-email"
          name="email"
          type="email"
          {...field("email", "api-email")}
        />
        {error("email", "api-email")}
      </div>
      <div className="field-group">
        <label htmlFor="api-message">Message</label>
        <textarea
          id="api-message"
          name="message"
          rows={5}
          {...field("message", "api-message")}
        />
        {error("message", "api-message")}
      </div>
      <button className="submit-button" type="submit" disabled={isPending}>
        {isPending ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
