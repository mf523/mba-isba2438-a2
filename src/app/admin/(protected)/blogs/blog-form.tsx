"use client";

import { useEffect, useState } from "react";
import Field from "@/components/field";
import TextareaField from "@/components/textarea-field";
import FormFeedback from "@/components/form-feedback";
import type { Blog } from "@/data/blogs";
import type { BlogFieldErrors } from "@/lib/blogs";

export default function BlogForm({
  editing,
  onSaved,
  onCancelEdit,
}: {
  editing: Blog | null;
  onSaved: (blog: Blog, mode: "create" | "edit") => void;
  onCancelEdit: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<BlogFieldErrors>({});
  const [isPending, setIsPending] = useState(false);
  const [prefillNotice, setPrefillNotice] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState<{
    title: string;
    summary: string;
    content: string;
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
            content: result.idea.body,
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
    const fromIdeaId = new URLSearchParams(window.location.search).get("from-idea");
    try {
      const response = await fetch(
        editing ? `/api/blogs/${editing.slug}` : "/api/blogs",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.get("title"),
            slug: data.get("slug"),
            summary: data.get("summary"),
            content: data.get("content"),
            ...(fromIdeaId ? { ideaId: fromIdeaId } : {}),
          }),
        },
      );
      const result = await response.json();
      if (response.ok && result.ok) {
        const savedBlog = result.blog as Blog;
        onSaved(savedBlog, editing ? "edit" : "create");
        setStatus("success");
        setMessage(
          editing
            ? `Blog post "${savedBlog.title}" updated.`
            : `Blog post added. View it at /blogs/${savedBlog.slug}.`,
        );
        setFieldErrors({});
        setPrefilled(null);
        setPrefillNotice(null);
        if (!editing) {
          form.reset();
          if (fromIdeaId) {
            window.history.replaceState(null, "", window.location.pathname);
          }
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
        id="blog-title"
        name="title"
        label="Title *"
        error={fieldErrors.title}
        key={editing ? `title-${editing.slug}` : "create-title"}
        defaultValue={editing?.title ?? prefilled?.title}
      />
      {editing ? (
        <p className="brief-meta">
          <span className="tag">/blogs/{editing.slug}</span> the slug cannot be
          changed
        </p>
      ) : (
        <Field
          id="blog-slug"
          name="slug"
          label="Slug"
          error={fieldErrors.slug}
          placeholder="auto-generated from title if left blank"
        />
      )}
      <Field
        id="blog-summary"
        name="summary"
        label="Summary *"
        error={fieldErrors.summary}
        key={editing ? `summary-${editing.slug}` : "create-summary"}
        defaultValue={editing?.summary ?? prefilled?.summary}
        placeholder="one-line summary shown on the blogs list"
      />
      <TextareaField
        id="blog-content"
        name="content"
        label="Content *"
        error={fieldErrors.content}
        key={editing ? `content-${editing.slug}` : "create-content"}
        defaultValue={editing?.content ?? prefilled?.content}
      />
      <button className="submit-button" type="submit" disabled={isPending}>
        {isPending ? "Saving..." : editing ? "Save changes" : "Add Blog Post"}
      </button>
      {editing ? (
        <button className="secondary-button" type="button" onClick={handleCancel}>
          Cancel edit
        </button>
      ) : null}
    </form>
  );
}
