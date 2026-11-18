import { NextResponse } from "next/server";
import { logApiCall, parseJsonBody, requireAdmin, withRoute } from "@/lib/api";
import {
  deleteContactSubmission,
  getContactSubmissionById,
  isContactStatus,
  updateContactSubmission,
} from "@/lib/contact-submissions";

export const GET = withRoute(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const denied = await requireAdmin();
    if (denied) {
      logApiCall(request, denied.status);
      return denied;
    }
    const { id } = await params;
    const submission = await getContactSubmissionById(id);
    if (!submission) {
      logApiCall(request, 404);
      return NextResponse.json(
        { ok: false, message: "Contact request not found." },
        { status: 404, headers: { "cache-control": "no-store" } },
      );
    }
    logApiCall(request, 200);
    return NextResponse.json(
      { ok: true, submission },
      { headers: { "cache-control": "no-store" } },
    );
  },
);

export const PUT = withRoute(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const denied = await requireAdmin();
    if (denied) {
      logApiCall(request, denied.status);
      return denied;
    }
    const { id } = await params;

    const parsed = await parseJsonBody(request);
    if (!parsed.ok) {
      logApiCall(request, parsed.response.status);
      return parsed.response;
    }

    const status = parsed.body.status;
    if (!isContactStatus(status)) {
      logApiCall(request, 400);
      return NextResponse.json(
        {
          ok: false,
          fieldErrors: { status: 'Status must be "new" or "archived".' },
        },
        { status: 400 },
      );
    }

    const result = await updateContactSubmission(id, status);
    if (!result.ok) {
      logApiCall(request, 404);
      return NextResponse.json(
        { ok: false, message: "Contact request not found." },
        { status: 404 },
      );
    }

    logApiCall(request, 200);
    return NextResponse.json(
      { ok: true, submission: result.submission },
      { headers: { "cache-control": "no-store" } },
    );
  },
);

export const DELETE = withRoute(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const denied = await requireAdmin();
    if (denied) {
      logApiCall(request, denied.status);
      return denied;
    }
    const { id } = await params;

    const result = await deleteContactSubmission(id);
    if (!result.ok) {
      logApiCall(request, 404);
      return NextResponse.json(
        { ok: false, message: "Contact request not found." },
        { status: 404 },
      );
    }

    logApiCall(request, 200);
    return NextResponse.json({ ok: true });
  },
);
