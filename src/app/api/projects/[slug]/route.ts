import { NextResponse } from "next/server";
import { logApiCall, parseJsonBody, requireAdmin } from "@/lib/api";
import {
  deleteProject,
  getProjectBySlug,
  parseTechStackInput,
  updateProject,
  validateProjectInput,
} from "@/lib/projects";
import { slugify } from "@/lib/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) {
    logApiCall(request, 404);
    return NextResponse.json(
      { ok: false, message: "Project not found." },
      { status: 404, headers: { "cache-control": "no-store" } },
    );
  }
  logApiCall(request, 200);
  return NextResponse.json(
    { ok: true, project },
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
  if (bodySlug.length > 0 && slugify(bodySlug) !== slug) {
    logApiCall(request, 400);
    return NextResponse.json(
      {
        ok: false,
        fieldErrors: { slug: "The slug cannot be changed. Delete and recreate the project instead." },
      },
      { status: 400 },
    );
  }

  const title = typeof input.title === "string" ? input.title.trim() : "";
  const summary = typeof input.summary === "string" ? input.summary.trim() : "";
  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  const repoUrl = typeof input.repoUrl === "string" ? input.repoUrl.trim() : "";
  const liveUrl = typeof input.liveUrl === "string" ? input.liveUrl.trim() : "";
  const techStack = parseTechStackInput(input.techStack);

  const fieldErrors = validateProjectInput({
    title,
    slug,
    summary,
    description,
    repoUrl,
    liveUrl,
    techStack,
  });
  if (Object.keys(fieldErrors).length > 0) {
    logApiCall(request, 400);
    return NextResponse.json({ ok: false, fieldErrors }, { status: 400 });
  }

  const result = await updateProject(slug, {
    title,
    summary,
    description,
    techStack,
    ...(repoUrl ? { repoUrl } : {}),
    ...(liveUrl ? { liveUrl } : {}),
  });
  if (!result.ok) {
    logApiCall(request, 404);
    return NextResponse.json(
      { ok: false, message: "Project not found." },
      { status: 404 },
    );
  }

  logApiCall(request, 200);
  return NextResponse.json(
    { ok: true, project: result.project },
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

  const result = await deleteProject(slug);
  if (!result.ok) {
    logApiCall(request, 404);
    return NextResponse.json(
      { ok: false, message: "Project not found." },
      { status: 404 },
    );
  }

  logApiCall(request, 200);
  return NextResponse.json({ ok: true });
}
