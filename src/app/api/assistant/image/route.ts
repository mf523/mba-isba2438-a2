import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { buildImagePrompt, requestNarrativeImage } from "@/lib/ai";
import { logApiCall, parseJsonBody, requireAdmin, withRoute } from "@/lib/api";
import { getIdeaById, isUsableIdeaId, updateIdeaImage } from "@/lib/ideas";
import { dataDir } from "@/lib/json-store";

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

  const ideaId = typeof parsed.body.ideaId === "string" ? parsed.body.ideaId.trim() : "";
  if (!isUsableIdeaId(ideaId)) {
    logApiCall(request, 400);
    return NextResponse.json(
      { ok: false, message: "A saved idea id is required." },
      { status: 400 },
    );
  }

  const idea = await getIdeaById(ideaId);
  if (!idea) {
    logApiCall(request, 404);
    return NextResponse.json(
      { ok: false, message: "Idea not found. Save the idea first, then generate its picture." },
      { status: 404 },
    );
  }
  if (idea.body.trim().length === 0) {
    logApiCall(request, 400);
    return NextResponse.json(
      { ok: false, message: "The idea needs a narrative before a picture can be generated." },
      { status: 400 },
    );
  }

  const outcome = await requestNarrativeImage(idea.body);
  if (outcome.status === "error") {
    const imagePrompt = buildImagePrompt(idea.body);
    const updated = await updateIdeaImage(ideaId, { imagePrompt });
    logApiCall(request, 502);
    return NextResponse.json(
      {
        ok: false,
        message: `${outcome.message} The image prompt was saved with the idea — try again later.`,
        idea: updated,
        artworkPending: true,
      },
      { status: 502 },
    );
  }

  const imagesDir = path.join(dataDir(), "images");
  await mkdir(imagesDir, { recursive: true });
  const fileName = `idea-${ideaId}.${outcome.extension}`;
  await writeFile(path.join(imagesDir, fileName), outcome.bytes);

  const imageUrl = `/api/images/${ideaId}`;
  const updated = await updateIdeaImage(ideaId, {
    imagePrompt: outcome.imagePrompt,
    imageUrl,
  });
  if (!updated) {
    logApiCall(request, 404);
    return NextResponse.json(
      { ok: false, message: "Idea not found." },
      { status: 404 },
    );
  }

  logApiCall(request, 200);
  return NextResponse.json(
    { ok: true, idea: updated },
    { headers: { "cache-control": "no-store" } },
  );
});
