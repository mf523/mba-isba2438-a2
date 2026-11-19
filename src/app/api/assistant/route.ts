import { NextResponse } from "next/server";
import {
  getAssistantProvider,
  getImageProvider,
  isAssistantConfigured,
} from "@/lib/ai";
import { logApiCall, requireAdmin, withRoute } from "@/lib/api";

export const GET = withRoute(async (request: Request) => {
  const denied = await requireAdmin();
  if (denied) {
    logApiCall(request, denied.status);
    return denied;
  }
  logApiCall(request, 200);
  return NextResponse.json(
    {
      ok: true,
      configured: isAssistantConfigured(),
      provider: getAssistantProvider(),
      imageProvider: getImageProvider(),
    },
    { headers: { "cache-control": "no-store" } },
  );
});
