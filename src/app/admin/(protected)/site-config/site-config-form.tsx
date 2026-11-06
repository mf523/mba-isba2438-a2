"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveSiteConfigAction } from "./actions";
import { initialSiteConfigFormState } from "./site-config-state";

interface SiteConfigFormProps {
  config: {
    siteName: string;
    tagline: string;
    contactEmail: string;
    footerText: string;
  };
}

export default function SiteConfigForm({ config }: SiteConfigFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveSiteConfigAction,
    initialSiteConfigFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} noValidate>
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
        <label htmlFor="siteName">Site name</label>
        <input
          id="siteName"
          name="siteName"
          type="text"
          defaultValue={config.siteName}
          aria-invalid={state.fieldErrors.name ? true : undefined}
          aria-describedby={state.fieldErrors.name ? "siteName-error" : undefined}
        />
        {state.fieldErrors.name ? (
          <p className="field-error" id="siteName-error">
            {state.fieldErrors.name}
          </p>
        ) : null}
      </div>
      <div className="field-group">
        <label htmlFor="tagline">Tagline</label>
        <input
          id="tagline"
          name="tagline"
          type="text"
          defaultValue={config.tagline}
        />
      </div>
      <div className="field-group">
        <label htmlFor="contactEmail">Contact email</label>
        <input
          id="contactEmail"
          name="contactEmail"
          type="email"
          defaultValue={config.contactEmail}
          aria-invalid={
            state.fieldErrors.email ? true : undefined
          }
          aria-describedby={
            state.fieldErrors.email ? "contactEmail-error" : undefined
          }
        />
        {state.fieldErrors.email ? (
          <p className="field-error" id="contactEmail-error">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>
      <div className="field-group">
        <label htmlFor="footerText">Footer text</label>
        <input
          id="footerText"
          name="footerText"
          type="text"
          defaultValue={config.footerText}
        />
      </div>
      <button className="submit-button" type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}
