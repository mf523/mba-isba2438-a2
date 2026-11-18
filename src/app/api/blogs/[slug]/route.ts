import { NextResponse } from "next/server";
import { logApiCall, parseJsonBody, requireAdmin } from "@/lib/api";
import {
  deleteBlog,
  getBlogBySlug,
  updateBlog,
  validateBlogInput,
} from "@/lib/blogs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  if (!blog) {
    logApiCall(request, 404);
    return NextResponse.json(
      { ok: false, message: "Blog post not found." },
      { status: 404, headers: { "cache-control": "no-store" } },
    );
  }
  logApiCall(request, 200);
  return NextResponse.json(
    { ok: true, blog },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const denied = await requireAdmin();
  if (denied) {
    logApiCall(request, denied.status);
    return denied;
  }
  const { slug } = await params;

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) {
    logApiCall(request, parsed.response.status);
    return parsed.response;
  }

  const input = parsed.body;
  const bodySlug = typeof input.slug === "string" ? input.slug.trim() : "";
  if (bodySlug.length > 0 && bodySlug !== slug) {
    logApiCall(request, 400);
    return NextResponse.json(
      {
        ok: false,
        fieldErrors: { slug: "The slug cannot be changed. Delete and recreate the post instead." },
      },
      { status: 400 },
    );
  }

  const title = typeof input.title === "string" ? input.title.trim() : "";
  const summary = typeof input.summary === "string" ? input.summary.trim() : "";
  const content = typeof input.content === "string" ? input.content.trim() : "";

  const fieldErrors = validateBlogInput({ title, slug, summary, content });
  if (Object.keys(fieldErrors).length > 0) {
    logApiCall(request, 400);
    return NextResponse.json({ ok: false, fieldErrors }, { status: 400 });
  }

  const result = await updateBlog(slug, { title, summary, content });
  if (!result.ok) {
    logApiCall(request, 404);
    return NextResponse.json(
      { ok: false, message: "Blog post not found." },
      { status: 404 },
    );
  }

  logApiCall(request, 200);
  return NextResponse.json(
    { ok: true, blog: result.blog },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const denied = await requireAdmin();
  if (denied) {
    logApiCall(request, denied.status);
    return denied;
  }
  const { slug } = await params;

  const result = await deleteBlog(slug);
  if (!result.ok) {
    logApiCall(request, 404);
    return NextResponse.json(
      { ok: false, message: "Blog post not found." },
      { status: 404 },
    );
  }

  logApiCall(request, 200);
  return NextResponse.json({ ok: true });
}
