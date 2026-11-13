"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Blog } from "@/data/blogs";

type PostState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "ready"; blog: Blog };

export default function BlogPostContent() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [state, setState] = useState<PostState>({ status: "loading" });

  useEffect(() => {
    if (state.status === "ready") {
      document.title = state.blog.title;
    }
  }, [state]);

  useEffect(() => {
    if (!slug) {
      return;
    }
    let cancelled = false;
    fetch(`/api/blogs/${slug}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(String(response.status));
        }
        return response.json();
      })
      .then((data) => {
        if (!cancelled) {
          setState({ status: "ready", blog: data.blog });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: "not-found" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.status === "loading") {
    return <p className="blogs-state">Loading post…</p>;
  }
  if (state.status === "not-found") {
    return (
      <div className="not-found">
        <h1>Post not found</h1>
        <p>The blog post you are looking for does not exist.</p>
        <p>
          <Link className="inline-link" href="/blogs">
            Back to all blog posts
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <h1>{state.blog.title}</h1>
      <p className="card-meta">
        {new Date(state.blog.publishedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
      <p>{state.blog.summary}</p>
      {state.blog.content
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter((paragraph) => paragraph.length > 0)
        .map((paragraph) => (
          <p key={paragraph.slice(0, 24)}>{paragraph}</p>
        ))}
    </>
  );
}
