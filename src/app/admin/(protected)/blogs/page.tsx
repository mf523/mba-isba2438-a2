import type { Metadata } from "next";
import AdminPage from "../admin-page";
import BlogBoard from "./blog-board";

export const metadata: Metadata = {
  title: "Blog Posts",
};

export default function AdminBlogsPage() {
  return (
    <AdminPage
      title="Blog posts"
      intro="Manage the blog posts shown on /blogs. Every change goes through the blogs API; posts appear on the public site immediately."
    >
      <BlogBoard />
    </AdminPage>
  );
}
