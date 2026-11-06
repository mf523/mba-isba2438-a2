"use client";

import { useActionState } from "react";
import { saveAboutAction } from "./actions";
import { initialAboutFormState } from "./about-state";

interface AboutFormProps {
  content: {
    intro: string;
    skills: string[];
    education: string;
    experience: string;
  };
}

export default function AboutForm({ content }: AboutFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveAboutAction,
    initialAboutFormState,
  );

  const field = (name: keyof typeof state.fieldErrors, id: string) => ({
    "aria-invalid": state.fieldErrors[name] ? true : undefined,
    "aria-describedby": state.fieldErrors[name] ? `${id}-error` : undefined,
  });
  const error = (name: keyof typeof state.fieldErrors, id: string) =>
    state.fieldErrors[name] ? (
      <p className="field-error" id={`${id}-error`}>
        {state.fieldErrors[name]}
      </p>
    ) : null;

  return (
    <form action={formAction} noValidate>
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
        <label htmlFor="intro">Intro *</label>
        <textarea
          id="intro"
          name="intro"
          rows={3}
          defaultValue={content.intro}
          {...field("intro", "intro")}
        />
        {error("intro", "intro")}
      </div>
      <div className="field-group">
        <label htmlFor="skills">Skills</label>
        <input
          id="skills"
          name="skills"
          type="text"
          placeholder="comma-separated, e.g. React, TypeScript"
          defaultValue={content.skills.join(", ")}
          {...field("skills", "skills")}
        />
        {error("skills", "skills")}
      </div>
      <div className="field-group">
        <label htmlFor="education">Education *</label>
        <textarea
          id="education"
          name="education"
          rows={3}
          defaultValue={content.education}
          {...field("education", "education")}
        />
        {error("education", "education")}
      </div>
      <div className="field-group">
        <label htmlFor="experience">Experience *</label>
        <textarea
          id="experience"
          name="experience"
          rows={3}
          defaultValue={content.experience}
          {...field("experience", "experience")}
        />
        {error("experience", "experience")}
      </div>
      <button className="submit-button" type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save About Page"}
      </button>
    </form>
  );
}
