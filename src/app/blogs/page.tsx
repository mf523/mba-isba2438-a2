import type { Metadata } from "next";
import BlogsList from "./blogs-list";

export const metadata: Metadata = {
  title: "Blogs",
};

export default function BlogsPage() {
  return (
    <>
      <h1>Blogs</h1>
      <p>Short write-ups loaded from the /api/blogs endpoint.</p>
      <BlogsList />
    </>
  );
}
