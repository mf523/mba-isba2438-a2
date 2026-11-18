"use client";

import { useEffect, useState } from "react";
import Field from "@/components/field";
import TextareaField from "@/components/textarea-field";
import FormFeedback from "@/components/form-feedback";
import type { Project } from "@/data/projects";
import type { ProjectFieldErrors } from "@/lib/projects";

export default function ProjectForm({
  editing,
  onSaved,
  onCancelEdit,
}: {
  editing: Project | null;
  onSaved: (project: Project, mode: "create" | "edit") => void;
  onCancelEdit: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ProjectFieldErrors>({});
  const [isPending, setIsPending] = useState(false);
  const [prefillNotice, setPrefillNotice] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState<{
    title: string;
    summary: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    const ideaId = new URLSearchParams(window.location.search).get("from-idea");
    if (!ideaId || editing) {
      return;
    }
    fetch(`/api/ideas/${ideaId}`, { headers: { "cache-control": "no-store" } })
      .then(async (response) => {
        const result = await response.json();
        if (response.ok && result.ok) {
          setPrefilled({
            title: result.idea.title,
            summary: result.idea.summary,
            description: result.idea.body,
          });
          setPrefillNotice(`Prefilled from the idea "${result.idea.title}".`);
        }
      })
      .catch(() => {});
  }, [editing]);

  function handleCancel() {
    setStatus("idle");
    setMessage("");
    setFieldErrors({});
    setPrefilled(null);
    setPrefillNotice(null);
    onCancelEdit();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setIsPending(true);
    setStatus("idle");
    try {
      const response = await fetch(
        editing ? `/api/projects/${editing.slug}` : "/api/projects",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.get("title"),
            slug: data.get("slug"),
            summary: data.get("summary"),
            description: data.get("description"),
            techStack: data.get("techStack"),
            repoUrl: data.get("repoUrl"),
            liveUrl: data.get("liveUrl"),
          }),
        },
      );
      const result = await response.json();
      if (response.ok && result.ok) {
        const savedProject = result.project as Project;
        onSaved(savedProject, editing ? "edit" : "create");
        setStatus("success");
        setMessage(
          editing
            ? `Project "${savedProject.title}" updated.`
            : `Project added. View it at /projects/${savedProject.slug}.`,
        );
        setFieldErrors({});
        setPrefilled(null);
        setPrefillNotice(null);
        if (!editing) {
          form.reset();
        }
      } else if (result.fieldErrors) {
        setStatus("error");
        setMessage("Please fix the highlighted fields and try again.");
        setFieldErrors(result.fieldErrors);
      } else {
        setStatus("error");
        setMessage(result.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Could not reach the server. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {status !== "idle" ? (
        <FormFeedback status={status} message={message} />
      ) : null}
      {prefillNotice ? (
        <p className="form-feedback form-feedback-success" role="status">
          {prefillNotice}
        </p>
      ) : null}

      <Field
        id="project-title"
        name="title"
        label="Title *"
        error={fieldErrors.title}
        key={editing ? `title-${editing.slug}` : "create-title"}
        defaultValue={editing?.title ?? prefilled?.title}
      />
      {editing ? (
        <p className="brief-meta">
          <span className="tag">/projects/{editing.slug}</span> the slug cannot
          be changed
        </p>
      ) : (
        <Field
          id="project-slug"
          name="slug"
          label="Slug"
          error={fieldErrors.slug}
          placeholder="auto-generated from title if left blank"
        />
      )}
      <Field
        id="project-summary"
        name="summary"
        label="Summary *"
        error={fieldErrors.summary}
        key={editing ? `summary-${editing.slug}` : "create-summary"}
        defaultValue={editing?.summary ?? prefilled?.summary}
        placeholder="one-line summary shown on the projects list"
      />
      <TextareaField
        id="project-description"
        name="description"
        label="Description *"
        error={fieldErrors.description}
        key={editing ? `description-${editing.slug}` : "create-description"}
        defaultValue={editing?.description ?? prefilled?.description}
      />
      <Field
        id="project-tech"
        name="techStack"
        label="Tech stack"
        error={fieldErrors.techStack}
        key={editing ? `tech-${editing.slug}` : "create-tech"}
        defaultValue={editing?.techStack.join(", ")}
        placeholder="comma-separated, e.g. React, TypeScript, CSS"
      />
      <Field
        id="project-repo"
        name="repoUrl"
        label="Repository URL"
        type="url"
        error={fieldErrors.repoUrl}
        defaultValue={editing?.repoUrl ?? ""}
        placeholder="https://github.com/…"
      />
      <Field
        id="project-live"
        name="liveUrl"
        label="Live URL"
        type="url"
        error={fieldErrors.liveUrl}
        defaultValue={editing?.liveUrl ?? ""}
        placeholder="https://…"
      />
      <button className="submit-button" type="submit" disabled={isPending}>
        {isPending
          ? "Saving..."
          : editing
            ? "Save changes"
            : "Add project"}
      </button>
      {editing ? (
        <button className="secondary-button" type="button" onClick={handleCancel}>
          Cancel edit
        </button>
      ) : null}
    </form>
  );
}
