"use client";

import { useEffect, useState } from "react";
import BlogForm from "./blog-form";
import BlogItem from "./blog-item";
import type { Blog } from "@/data/blogs";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; blogs: Blog[] };

type Editor =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; blog: Blog };

export default function BlogBoard() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [editor, setEditor] = useState<Editor>({ mode: "closed" });

  function load() {
    fetch("/api/blogs", { headers: { "cache-control": "no-store" } })
      .then(async (response) => {
        const result = await response.json();
        if (response.ok && result.ok) {
          setState({ status: "ready", blogs: result.blogs });
        } else {
          setState({
            status: "error",
            message:
              response.status === 401
                ? "Sign in again to see your blog posts."
                : "Could not load blog posts. Please try again.",
          });
        }
      })
      .catch(() => {
        setState({ status: "error", message: "Could not reach the server." });
      });
  }

  useEffect(() => {
    load();
  }, []);

  function handleSaved(blog: Blog, mode: "create" | "edit") {
    if (state.status !== "ready") {
      load();
      return;
    }
    setState({
      status: "ready",
      blogs:
        mode === "create"
          ? [...state.blogs, blog]
          : state.blogs.map((candidate) =>
              candidate.slug === blog.slug ? blog : candidate,
            ),
    });
    setEditor({ mode: "closed" });
  }

  function handleDeleted(slug: string) {
    if (state.status !== "ready") {
      load();
      return;
    }
    setState({
      status: "ready",
      blogs: state.blogs.filter((candidate) => candidate.slug !== slug),
    });
    if (editor.mode === "edit" && editor.blog.slug === slug) {
      setEditor({ mode: "closed" });
    }
  }

  const sorted =
    state.status === "ready"
      ? [...state.blogs].sort((a, b) =>
          b.publishedAt.localeCompare(a.publishedAt),
        )
      : [];

  return (
    <>
      <section aria-label={editor.mode === "edit" ? "Edit blog post" : "Add a blog post"}>
        <h2>{editor.mode === "edit" ? `Edit "${editor.blog.title}"` : "Add a blog post"}</h2>
        <BlogForm
          editing={editor.mode === "edit" ? editor.blog : null}
          onSaved={handleSaved}
          onCancelEdit={() => setEditor({ mode: "closed" })}
        />
      </section>

      <section aria-label="Published blog posts">
        <h2>Published posts</h2>
        {state.status === "loading" ? <p>Loading blog posts…</p> : null}
        {state.status === "error" ? (
          <p className="form-feedback form-feedback-error" role="alert">
            {state.message}{" "}
            <button className="secondary-button" type="button" onClick={load}>
              Retry
            </button>
          </p>
        ) : null}
        {state.status === "ready" ? (
          sorted.length === 0 ? (
            <p className="briefs-empty">
              No blog posts yet. Add the first one with the form above.
            </p>
          ) : (
            <ul className="brief-list">
              {sorted.map((blog) => (
                <BlogItem
                  key={blog.slug}
                  blog={blog}
                  onEdit={() => {
                    setEditor({ mode: "edit", blog });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onDeleted={() => handleDeleted(blog.slug)}
                />
              ))}
            </ul>
          )
        ) : null}
      </section>
    </>
  );
}
