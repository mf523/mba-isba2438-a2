import { NextResponse } from "next/server";
import {
  getAssistantProvider,
  isAssistantConfigured,
  requestSuggestion,
  validateAssistantRequest,
  type AssistantImageType,
} from "@/lib/ai";
import { logApiCall, requireAdmin } from "@/lib/api";

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) {
    logApiCall(request, denied.status);
    return denied;
  }
  logApiCall(request, 200);
  return NextResponse.json(
    { ok: true, configured: isAssistantConfigured(), provider: getAssistantProvider() },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) {
    logApiCall(request, denied.status);
    return denied;
  }

  if (!isAssistantConfigured()) {
    logApiCall(request, 503);
    return NextResponse.json(
      {
        ok: false,
        message:
          "The AI assistant is not configured. Set ANTHROPIC_API_KEY and restart the server.",
      },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    logApiCall(request, 400);
    return NextResponse.json(
      { ok: false, message: "Request must be multipart form data." },
      { status: 400 },
    );
  }

  const targetType = String(form.get("targetType") ?? "").trim();
  const notes = String(form.get("notes") ?? "").trim();
  const briefTitle = String(form.get("briefTitle") ?? "").trim();
  const briefAudience = String(form.get("briefAudience") ?? "").trim();
  const briefTone = String(form.get("briefTone") ?? "").trim();
  const briefKeyPoints = String(form.get("briefKeyPoints") ?? "").trim();
  const hasBrief = briefTitle.length > 0 || briefKeyPoints.length > 0;

  const imageFile = form.get("image");
  let image: { mediaType: AssistantImageType; base64: string; sizeBytes: number } | null = null;
  if (
    imageFile &&
    typeof imageFile === "object" &&
    "arrayBuffer" in imageFile &&
    imageFile.size > 0
  ) {
    image = {
      mediaType: imageFile.type as AssistantImageType,
      sizeBytes: imageFile.size,
      base64: Buffer.from(await imageFile.arrayBuffer()).toString("base64"),
    };
  }

  const validation = validateAssistantRequest({ targetType, notes, image });
  if (!validation.ok) {
    logApiCall(request, validation.status);
    return NextResponse.json(
      { ok: false, message: validation.message },
      { status: validation.status },
    );
  }

  const outcome = await requestSuggestion({
    targetType,
    notes,
    brief: hasBrief
      ? { title: briefTitle, audience: briefAudience, tone: briefTone, keyPoints: briefKeyPoints }
      : null,
    image: image ? { mediaType: image.mediaType, base64: image.base64 } : null,
  });

  if (outcome.status === "refusal") {
    logApiCall(request, 502);
    return NextResponse.json({ ok: false, message: outcome.message }, { status: 502 });
  }
  if (outcome.status === "error") {
    logApiCall(request, 502);
    return NextResponse.json({ ok: false, message: outcome.message }, { status: 502 });
  }

  logApiCall(request, 200);
  return NextResponse.json(
    { ok: true, suggestion: outcome.suggestion },
    { headers: { "cache-control": "no-store" } },
  );
}
