import { NextResponse } from "next/server";
import { isIdeaTargetType } from "@/data/ideas";
import {
  deleteIdea,
  getIdeaById,
  updateIdea,
  validateIdeaInput,
} from "@/lib/ideas";
import { logApiCall, parseJsonBody, requireAdmin } from "@/lib/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const denied = await requireAdmin();
  if (denied) {
    logApiCall(request, denied.status);
    return denied;
  }
  const { id } = await context.params;
  const idea = await getIdeaById(id);
  if (!idea) {
    logApiCall(request, 404);
    return NextResponse.json(
      { ok: false, message: "Idea not found." },
      { status: 404, headers: { "cache-control": "no-store" } },
    );
  }
  logApiCall(request, 200);
  return NextResponse.json(
    { ok: true, idea },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PUT(request: Request, context: RouteContext) {
  const denied = await requireAdmin();
  if (denied) {
    logApiCall(request, denied.status);
    return denied;
  }

  const { id } = await context.params;
  const existing = await getIdeaById(id);
  if (!existing) {
    logApiCall(request, 404);
    return NextResponse.json(
      { ok: false, message: "Idea not found." },
      { status: 404 },
    );
  }

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) {
    logApiCall(request, parsed.response.status);
    return parsed.response;
  }

  const input = parsed.body;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const summary = typeof input.summary === "string" ? input.summary.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  const targetType = typeof input.targetType === "string" ? input.targetType.trim() : "";

  const fieldErrors = validateIdeaInput({ title, summary, body, targetType });
  if (Object.keys(fieldErrors).length > 0) {
    logApiCall(request, 400);
    return NextResponse.json({ ok: false, fieldErrors }, { status: 400 });
  }

  if (!isIdeaTargetType(targetType)) {
    logApiCall(request, 400);
    return NextResponse.json({ ok: false, fieldErrors }, { status: 400 });
  }

  const idea = await updateIdea(id, { title, summary, body, targetType });
  logApiCall(request, 200);
  return NextResponse.json({ ok: true, idea });
}

export async function DELETE(request: Request, context: RouteContext) {
  const denied = await requireAdmin();
  if (denied) {
    logApiCall(request, denied.status);
    return denied;
  }
  const { id } = await context.params;
  const deleted = await deleteIdea(id);
  if (!deleted) {
    logApiCall(request, 404);
    return NextResponse.json(
      { ok: false, message: "Idea not found." },
      { status: 404 },
    );
  }
  logApiCall(request, 200);
  return NextResponse.json({ ok: true, id });
}
