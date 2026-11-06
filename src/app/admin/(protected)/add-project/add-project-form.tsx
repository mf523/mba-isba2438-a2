"use client";

import { useActionState, useEffect, useRef } from "react";
import { addProjectAction } from "./actions";
import { initialAddProjectFormState } from "./add-project-state";

export default function AddProjectForm() {
  const [state, formAction, isPending] = useActionState(
    addProjectAction,
    initialAddProjectFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

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
    <form ref={formRef} action={formAction} noValidate>
      {state.status === "success" ? (
        <p
          className="form-feedback form-feedback-success"
          role="status"
          aria-live="polite"
        >
          {state.message}{" "}
          {state.projectSlug ? (
            <a
              className="inline-link"
              href={`/projects/${state.projectSlug}`}
            >
              View project
            </a>
          ) : null}
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
        <label htmlFor="title">Title *</label>
        <input id="title" name="title" type="text" {...field("title", "title")} />
        {error("title", "title")}
      </div>
      <div className="field-group">
        <label htmlFor="slug">Slug</label>
        <input
          id="slug"
          name="slug"
          type="text"
          placeholder="auto-generated from title if left blank"
          {...field("slug", "slug")}
        />
        {error("slug", "slug")}
      </div>
      <div className="field-group">
        <label htmlFor="summary">Summary *</label>
        <input
          id="summary"
          name="summary"
          type="text"
          placeholder="one-line summary shown on project cards"
          {...field("summary", "summary")}
        />
        {error("summary", "summary")}
      </div>
      <div className="field-group">
        <label htmlFor="description">Description *</label>
        <textarea
          id="description"
          name="description"
          rows={4}
          {...field("description", "description")}
        />
        {error("description", "description")}
      </div>
      <div className="field-group">
        <label htmlFor="techStack">Tech stack</label>
        <input
          id="techStack"
          name="techStack"
          type="text"
          placeholder="comma-separated, e.g. React, TypeScript"
          {...field("techStack", "techStack")}
        />
        {error("techStack", "techStack")}
      </div>
      <div className="field-group">
        <label htmlFor="repoUrl">Repository URL</label>
        <input
          id="repoUrl"
          name="repoUrl"
          type="url"
          placeholder="https://github.com/…"
          {...field("repoUrl", "repoUrl")}
        />
        {error("repoUrl", "repoUrl")}
      </div>
      <div className="field-group">
        <label htmlFor="liveUrl">Live demo URL</label>
        <input
          id="liveUrl"
          name="liveUrl"
          type="url"
          placeholder="https://…"
          {...field("liveUrl", "liveUrl")}
        />
        {error("liveUrl", "liveUrl")}
      </div>
      <button className="submit-button" type="submit" disabled={isPending}>
        {isPending ? "Adding..." : "Add Project"}
      </button>
    </form>
  );
}
