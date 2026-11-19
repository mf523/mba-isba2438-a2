import { NextResponse } from "next/server";
import {
  isAssistantConfigured,
  requestChoices,
  validateChoicesRequest,
} from "@/lib/ai";
import { logApiCall, parseJsonBody, requireAdmin, withRoute } from "@/lib/api";

export const POST = withRoute(async (request: Request) => {
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
          "The AI assistant is not configured. Set ANTHROPIC_API_KEY (or AI_PROVIDER=ollama) and restart the server.",
      },
      { status: 503 },
    );
  }

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) {
    logApiCall(request, parsed.response.status);
    return parsed.response;
  }

  const body = parsed.body;
  const seed = typeof body.seed === "string" ? body.seed.trim() : "";
  const targetType =
    typeof body.targetType === "string" ? body.targetType.trim() : "";
  const briefBody = (body.brief ?? null) as Record<string, unknown> | null;
  const brief =
    briefBody && typeof briefBody === "object"
      ? {
          title: String(briefBody.title ?? ""),
          audience: String(briefBody.audience ?? ""),
          tone: String(briefBody.tone ?? ""),
          keyPoints: String(briefBody.keyPoints ?? ""),
        }
      : null;

  const validation = validateChoicesRequest({ seed, targetType });
  if (!validation.ok) {
    logApiCall(request, validation.status);
    return NextResponse.json(
      { ok: false, message: validation.message },
      { status: validation.status },
    );
  }

  const outcome = await requestChoices({ seed, targetType, brief });
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
    { ok: true, choices: outcome.choices },
    { headers: { "cache-control": "no-store" } },
  );
});
