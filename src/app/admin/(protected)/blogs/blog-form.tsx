"use client";

import { useRef, useState } from "react";
import type { BlogFieldErrors } from "@/lib/blogs";
import FormFeedback from "@/components/form-feedback";

interface BlogApiFormState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: BlogFieldErrors;
  blogSlug?: string;
}

const initial: BlogApiFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};

export default function BlogForm() {
  const [state, setState] = useState<BlogApiFormState>(initial);
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
      const response = await fetch("/api/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.get("title"),
          slug: data.get("slug"),
          summary: data.get("summary"),
          content: data.get("content"),
        }),
      });
      const result = await response.json();
      if (response.status === 201 && result.ok) {
        form.reset();
        setState({
          status: "success",
          message: `Blog post added. View it at /blogs/${result.blog.slug}.`,
          fieldErrors: {},
          blogSlug: result.blog.slug,
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

  const field = (name: keyof BlogFieldErrors, id: string) => ({
    "aria-invalid": state.fieldErrors[name] ? true : undefined,
    "aria-describedby": state.fieldErrors[name] ? `${id}-error` : undefined,
  });
  const error = (name: keyof BlogFieldErrors, id: string) =>
    state.fieldErrors[name] ? (
      <p className="field-error" id={`${id}-error`}>
        {state.fieldErrors[name]}
      </p>
    ) : null;

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      {state.status !== "idle" ? (
        <FormFeedback status={state.status} message={state.message}>
          {state.status === "success" && state.blogSlug ? (
            <a className="inline-link" href={`/blogs/${state.blogSlug}`}>
              View post
            </a>
          ) : null}
        </FormFeedback>
      ) : null}
      <div className="field-group">
        <label htmlFor="blog-title">Title *</label>
        <input
          id="blog-title"
          name="title"
          type="text"
          {...field("title", "blog-title")}
        />
        {error("title", "blog-title")}
      </div>
      <div className="field-group">
        <label htmlFor="blog-slug">Slug</label>
        <input
          id="blog-slug"
          name="slug"
          type="text"
          placeholder="auto-generated from title if left blank"
          {...field("slug", "blog-slug")}
        />
        {error("slug", "blog-slug")}
      </div>
      <div className="field-group">
        <label htmlFor="blog-summary">Summary *</label>
        <input
          id="blog-summary"
          name="summary"
          type="text"
          placeholder="one-line summary shown on the blogs list"
          {...field("summary", "blog-summary")}
        />
        {error("summary", "blog-summary")}
      </div>
      <div className="field-group">
        <label htmlFor="blog-content">Content *</label>
        <textarea
          id="blog-content"
          name="content"
          rows={6}
          {...field("content", "blog-content")}
        />
        {error("content", "blog-content")}
      </div>
      <button className="submit-button" type="submit" disabled={isPending}>
        {isPending ? "Adding..." : "Add Blog Post"}
      </button>
    </form>
  );
}
