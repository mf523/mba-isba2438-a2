import { NextResponse } from "next/server";
import { getBlogBySlug } from "@/lib/blogs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  if (!blog) {
    return NextResponse.json(
      { ok: false, message: "Blog post not found." },
      { status: 404, headers: { "cache-control": "no-store" } },
    );
  }
  return NextResponse.json(
    { ok: true, blog },
    { headers: { "cache-control": "no-store" } },
  );
}
