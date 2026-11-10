import { NextResponse } from "next/server";
import {
  saveContactSubmission,
  validateContactInput,
} from "@/lib/contact-submissions";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const input = body as Record<string, unknown>;
  const payload = {
    name: typeof input.name === "string" ? input.name : "",
    email: typeof input.email === "string" ? input.email : "",
    message: typeof input.message === "string" ? input.message : "",
  };

  const fieldErrors = validateContactInput(payload);
  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      { ok: false, fieldErrors },
      { status: 400 },
    );
  }

  try {
    const submission = await saveContactSubmission(payload);
    return NextResponse.json(
      { ok: true, submission },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
