import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { logApiCall, requireAdmin, withRoute } from "@/lib/api";
import { getIdeaById } from "@/lib/ideas";
import { dataDir } from "@/lib/json-store";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export const GET = withRoute(
  async (
    request: Request,
    { params }: { params: Promise<{ ideaId: string }> },
  ) => {
    const denied = await requireAdmin();
    if (denied) {
      logApiCall(request, denied.status);
      return denied;
    }

    const { ideaId } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ideaId)) {
      logApiCall(request, 400);
      return NextResponse.json(
        { ok: false, message: "Invalid idea id." },
        { status: 400 },
      );
    }

    const idea = await getIdeaById(ideaId);
    if (!idea?.imageUrl) {
      logApiCall(request, 404);
      return NextResponse.json(
        { ok: false, message: "No picture for this idea." },
        { status: 404 },
      );
    }

    for (const [extension, contentType] of Object.entries(CONTENT_TYPES)) {
      try {
        const file = path.join(dataDir(), "images", `idea-${ideaId}.${extension}`);
        const bytes = await readFile(file);
        logApiCall(request, 200);
        return new NextResponse(bytes, {
          headers: {
            "content-type": contentType,
            "cache-control": "no-store",
          },
        });
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: unknown }).code !== "ENOENT"
        ) {
          throw error;
        }
      }
    }

    logApiCall(request, 404);
    return NextResponse.json(
      { ok: false, message: "No picture file for this idea." },
      { status: 404 },
    );
  },
);
