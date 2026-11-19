import { NextResponse } from "next/server";
import { logApiCall, parseJsonBody, requireAdmin, withRoute } from "@/lib/api";
import {
  addProject,
  getProjects,
  parseTechStackInput,
  validateProjectInput,
} from "@/lib/projects";
import { isUsableIdeaId, markIdeaUsed } from "@/lib/ideas";
import { slugify } from "@/lib/validation";

export const GET = withRoute(async (request: Request) => {
  const projects = await getProjects();
  logApiCall(request, 200);
  return NextResponse.json(
    { ok: true, projects },
    { headers: { "cache-control": "no-store" } },
  );
});

export const POST = withRoute(async (request: Request) => {
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
  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  const repoUrl = typeof input.repoUrl === "string" ? input.repoUrl.trim() : "";
  const liveUrl = typeof input.liveUrl === "string" ? input.liveUrl.trim() : "";
  const techStack = parseTechStackInput(input.techStack);
  const slugInput = typeof input.slug === "string" ? input.slug.trim() : "";
  const slug = slugInput.length > 0 ? slugify(slugInput) : slugify(title);

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

  const result = await addProject({
    slug,
    title,
    summary,
    description,
    techStack,
    ...(repoUrl ? { repoUrl } : {}),
    ...(liveUrl ? { liveUrl } : {}),
  });
  if (!result.ok) {
    logApiCall(request, 409);
    return NextResponse.json(
      {
        ok: false,
        fieldErrors: { slug: "A project with this slug already exists." },
      },
      { status: 409 },
    );
  }

  logApiCall(request, 201);
  const fromIdeaId =
    typeof input.ideaId === "string" ? input.ideaId.trim() : "";
  if (isUsableIdeaId(fromIdeaId)) {
    const linked = await markIdeaUsed(fromIdeaId, {
      type: "project",
      title: result.project.title,
      href: `/projects/${result.project.slug}`,
    });
    if (linked) {
      console.log(`[ideas] idea ${fromIdeaId} marked used → /projects/${result.project.slug}`);
    }
  }
  return NextResponse.json(
    { ok: true, project: result.project },
    { status: 201 },
  );
});
