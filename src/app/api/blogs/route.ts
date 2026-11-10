import { NextResponse } from "next/server";
import { addBlog, getBlogs, validateBlogInput } from "@/lib/blogs";
import { slugify } from "@/lib/validation";

export async function GET() {
  const blogs = await getBlogs();
  return NextResponse.json({ ok: true, blogs });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const input = body as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const summary = typeof input.summary === "string" ? input.summary.trim() : "";
  const content = typeof input.content === "string" ? input.content.trim() : "";
  const slugInput = typeof input.slug === "string" ? input.slug.trim() : "";
  const slug = slugInput.length > 0 ? slugify(slugInput) : slugify(title);

  const fieldErrors = validateBlogInput({ title, slug, summary, content });
  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      { ok: false, fieldErrors },
      { status: 400 },
    );
  }

  const result = await addBlog({ slug, title, summary, content });
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        fieldErrors: { slug: "A blog post with this slug already exists." },
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, blog: result.blog }, { status: 201 });
}
