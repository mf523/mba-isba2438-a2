import type { Metadata } from "next";
import { Suspense } from "react";
import AdminGate from "../admin-gate";
import BlogBoard from "./blog-board";

export const metadata: Metadata = {
  title: "Blog Posts",
};

function BlogPageContent() {
  return (
    <>
      <p>
        Manage the blog posts shown on /blogs. Every change goes through the
        blogs API; posts appear on the public site immediately.
      </p>
      <BlogBoard />
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
