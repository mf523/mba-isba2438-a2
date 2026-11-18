import type { Metadata } from "next";
import { Suspense } from "react";
import BlogPostContent from "./blog-post-content";
import { getBlogBySlug } from "@/lib/blogs";

export async function generateMetadata(
  { params }: PageProps<"/blogs/[slug]">,
): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  return { title: blog ? blog.title : "Blog Post" };
}

export default function BlogPostPage() {
  return (
    <Suspense fallback={<p className="blogs-state">Loading post…</p>}>
      <BlogPostContent />
    </Suspense>
  );
}
