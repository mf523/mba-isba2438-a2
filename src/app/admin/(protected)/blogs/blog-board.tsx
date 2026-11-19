"use client";

import { useEffect, useState } from "react";
import Drawer from "@/components/drawer";
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
  const [notice, setNotice] = useState<string | null>(null);

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

  useEffect(() => {
    const fromIdea = new URLSearchParams(window.location.search).get("from-idea");
    if (!fromIdea) return;
    const id = window.setTimeout(() => setEditor({ mode: "create" }), 0);
    return () => window.clearTimeout(id);
  }, []);

  function handleSaved(blog: Blog, mode: "create" | "edit") {
    setNotice(
      mode === "create"
        ? `Blog post published. View it at /blogs/${blog.slug}.`
        : `Blog post "${blog.title}" updated.`,
    );
    if (state.status !== "ready") {
      load();
      setEditor({ mode: "closed" });
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
      {notice ? (
        <p className="form-feedback form-feedback-success" role="status" aria-live="polite">
          {notice}
        </p>
      ) : null}

      {editor.mode === "closed" ? (
        <p>
          <button
            className="submit-button"
            type="button"
            onClick={() => setEditor({ mode: "create" })}
          >
            New blog post
          </button>
        </p>
      ) : null}

      <Drawer
        open={editor.mode !== "closed"}
        onClose={() => setEditor({ mode: "closed" })}
        title={editor.mode === "edit" ? `Edit "${editor.blog.title}"` : "New blog post"}
      >
        <BlogForm
          editing={editor.mode === "edit" ? editor.blog : null}
          onSaved={handleSaved}
          onCancelEdit={() => setEditor({ mode: "closed" })}
        />
      </Drawer>

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
              No blog posts yet. Add the first one with the New blog post button.
            </p>
          ) : (
            <ul className="brief-list">
              {sorted.map((blog) => (
                <BlogItem
                  key={blog.slug}
                  blog={blog}
                  onEdit={() => {
                    setEditor({ mode: "edit", blog });
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
