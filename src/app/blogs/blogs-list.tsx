"use client";

import { useEffect, useState } from "react";
import type { Blog } from "@/data/blogs";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; blogs: Blog[] };

export default function BlogsList() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/blogs")
      .then((response) => {
        if (!response.ok) {
          throw new Error(String(response.status));
        }
        return response.json();
      })
      .then((data) => {
        if (!cancelled) {
          setState({ status: "ready", blogs: data.blogs });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: "error" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return <p className="blogs-state">Loading posts…</p>;
  }
  if (state.status === "error") {
    return (
      <p className="blogs-state">
        Could not load posts from /api/blogs. Please try again later.
      </p>
    );
  }
  if (state.blogs.length === 0) {
    return <p className="blogs-state">No blog posts yet.</p>;
  }

  return (
    <ul className="card-list">
      {state.blogs.map((blog) => (
        <li key={blog.slug} className="card">
          <h3>
            <a className="inline-link" href={`/blogs/${blog.slug}`}>
              {blog.title}
            </a>
          </h3>
          <p>{blog.summary}</p>
          <p className="card-meta">
            {new Date(blog.publishedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </li>
      ))}
    </ul>
  );
}
