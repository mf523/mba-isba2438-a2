"use client";

import DeleteButton from "@/components/delete-button";
import type { Blog } from "@/data/blogs";

export default function BlogItem({
  blog,
  onEdit,
  onDeleted,
}: {
  blog: Blog;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  async function handleDelete() {
    try {
      const response = await fetch(`/api/blogs/${blog.slug}`, {
        method: "DELETE",
      });
      if (response.ok) {
        onDeleted();
      } else {
        window.alert(
          "The blog post could not be deleted. Please try again after reloading.",
        );
      }
    } catch {
      window.alert("Could not reach the server. Please try again.");
    }
  }

  return (
    <li className="card brief-card">
      <div className="brief-card-head">
        <h3>{blog.title}</h3>
        <div className="brief-card-actions">
          <button className="secondary-button" type="button" onClick={onEdit}>
            Edit
          </button>
          <DeleteButton
            confirmMessage={`Delete the blog post "${blog.title}"? This cannot be undone.`}
            onDelete={handleDelete}
          />
        </div>
      </div>
      <p>{blog.summary}</p>
      <p className="brief-meta">
        <span className="tag">/blogs/{blog.slug}</span>
        <span className="brief-audience">
          published {new Date(blog.publishedAt).toLocaleString("en-US")}
        </span>
      </p>
    </li>
  );
}
