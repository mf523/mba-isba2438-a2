import { NextResponse } from "next/server";
import { logApiCall, parseJsonBody, requireAdmin, withRoute } from "@/lib/api";
import {
  getContactSubmissions,
  saveContactSubmission,
  validateContactInput,
} from "@/lib/contact-submissions";

export const GET = withRoute(async (request: Request) => {
  const denied = await requireAdmin();
  if (denied) {
    logApiCall(request, denied.status);
    return denied;
  }
  const submissions = await getContactSubmissions();
  const sorted = [...submissions].sort((a, b) =>
    b.submittedAt.localeCompare(a.submittedAt),
  );
  logApiCall(request, 200);
  return NextResponse.json(
    { ok: true, submissions: sorted },
    { headers: { "cache-control": "no-store" } },
  );
});

export const POST = withRoute(async (request: Request) => {
  const parsed = await parseJsonBody(request);
  if (!parsed.ok) {
    logApiCall(request, parsed.response.status);
    return parsed.response;
  }

  const input = parsed.body;
  const payload = {
    name: typeof input.name === "string" ? input.name : "",
    email: typeof input.email === "string" ? input.email : "",
    message: typeof input.message === "string" ? input.message : "",
  };

  const fieldErrors = validateContactInput(payload);
  if (Object.keys(fieldErrors).length > 0) {
    logApiCall(request, 400);
    return NextResponse.json(
      { ok: false, fieldErrors },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const submission = await saveContactSubmission(payload);
    logApiCall(request, 201);
    return NextResponse.json(
      { ok: true, submission },
      { status: 201, headers: { "cache-control": "no-store" } },
    );
  } catch {
    logApiCall(request, 500);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Please try again." },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
});
