"use client";

import { useRef, useState } from "react";
import type { ContactFieldErrors } from "@/lib/contact-submissions";
import Field from "@/components/field";
import TextareaField from "@/components/textarea-field";
import FormFeedback from "@/components/form-feedback";

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

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      {state.status !== "idle" ? (
        <FormFeedback status={state.status} message={state.message} />
      ) : null}
      <Field
        id="api-name"
        name="name"
        label="Name"
        error={state.fieldErrors.name}
      />
      <Field
        id="api-email"
        name="email"
        label="Email"
        type="email"
        error={state.fieldErrors.email}
      />
      <TextareaField
        id="api-message"
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
