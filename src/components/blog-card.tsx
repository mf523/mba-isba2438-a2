import type { Blog } from "@/data/blogs";
import { formatDate } from "@/lib/format";

export default function BlogCard({ blog }: { blog: Blog }) {
  return (
    <li className="card">
      <h3>
        <a className="inline-link" href={`/blogs/${blog.slug}`}>
          {blog.title}
        </a>
      </h3>
      <p>{blog.summary}</p>
      <p className="card-meta">{formatDate(blog.publishedAt)}</p>
    </li>
  );
}
