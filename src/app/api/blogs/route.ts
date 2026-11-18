import { NextResponse } from "next/server";
import { logApiCall, parseJsonBody, requireAdmin } from "@/lib/api";
import {
  addBlog,
  getBlogs,
  validateBlogInput,
} from "@/lib/blogs";
import { slugify } from "@/lib/validation";

export async function GET(request: Request) {
  const blogs = await getBlogs();
  logApiCall(request, 200);
  return NextResponse.json(
    { ok: true, blogs },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) {
    logApiCall(request, denied.status);
    return denied;
  }

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) {
    logApiCall(request, parsed.response.status);
    return parsed.response;
  }

  const input = parsed.body;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const summary = typeof input.summary === "string" ? input.summary.trim() : "";
  const content = typeof input.content === "string" ? input.content.trim() : "";
  const slugInput = typeof input.slug === "string" ? input.slug.trim() : "";
  const slug = slugInput.length > 0 ? slugify(slugInput) : slugify(title);

  const fieldErrors = validateBlogInput({ title, slug, summary, content });
  if (Object.keys(fieldErrors).length > 0) {
    logApiCall(request, 400);
    return NextResponse.json(
      { ok: false, fieldErrors },
      { status: 400 },
    );
  }

  const result = await addBlog({ slug, title, summary, content });
  if (!result.ok) {
    logApiCall(request, 409);
    return NextResponse.json(
      {
        ok: false,
        fieldErrors: { slug: "A blog post with this slug already exists." },
      },
      { status: 409 },
    );
  }

  logApiCall(request, 201);
  return NextResponse.json(
    { ok: true, blog: result.blog },
    { status: 201, headers: { "cache-control": "no-store" } },
  );
}
