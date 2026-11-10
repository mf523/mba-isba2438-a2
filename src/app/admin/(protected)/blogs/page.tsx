import type { Metadata } from "next";
import { Suspense } from "react";
import AdminGate from "../admin-gate";
import BlogForm from "./blog-form";

export const metadata: Metadata = {
  title: "New Blog Post",
};

function BlogPageContent() {
  return (
    <>
      <p>
        Create a blog post. Submitting sends a POST request to /api/blogs,
        which validates and saves the post; it appears on /blogs immediately.
      </p>
      <BlogForm />
    </>
  );
}

export default function AdminBlogsPage() {
  return (
    <>
      <h1>Blog posts</h1>
      <Suspense fallback={null}>
        <AdminGate>
          <BlogPageContent />
        </AdminGate>
      </Suspense>
    </>
  );
}
