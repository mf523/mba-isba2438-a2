import type { Metadata } from "next";
import { Suspense } from "react";
import BlogPostContent from "./blog-post-content";

export const metadata: Metadata = {
  title: "Blog Post",
};

export default function BlogPostPage() {
  return (
    <Suspense fallback={<p className="blogs-state">Loading post…</p>}>
      <BlogPostContent />
    </Suspense>
  );
}
