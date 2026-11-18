import { NextResponse } from "next/server";
import { isIdeaOrigin, isIdeaTargetType } from "@/data/ideas";
import { addIdea, listIdeas, validateIdeaInput } from "@/lib/ideas";
import { logApiCall, parseJsonBody, requireAdmin } from "@/lib/api";

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) {
    logApiCall(request, denied.status);
    return denied;
  }
  const ideas = await listIdeas();
  logApiCall(request, 200);
  return NextResponse.json(
    { ok: true, ideas },
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
  const body = typeof input.body === "string" ? input.body.trim() : "";
  const targetType = typeof input.targetType === "string" ? input.targetType.trim() : "";
  const origin = isIdeaOrigin(input.origin) ? input.origin : "hand";

  const fieldErrors = validateIdeaInput({ title, summary, body, targetType });
  if (Object.keys(fieldErrors).length > 0) {
    logApiCall(request, 400);
    return NextResponse.json({ ok: false, fieldErrors }, { status: 400 });
  }

  if (!isIdeaTargetType(targetType)) {
    logApiCall(request, 400);
    return NextResponse.json({ ok: false, fieldErrors }, { status: 400 });
  }

  const idea = await addIdea({ title, summary, body, targetType, origin });
  logApiCall(request, 201);
  return NextResponse.json({ ok: true, idea }, { status: 201 });
}
