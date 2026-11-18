import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";

export async function requireAdmin(): Promise<NextResponse | null> {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { ok: false, message: "Admin sign-in required." },
      { status: 401 },
    );
  }
  return null;
}

export type JsonBodyResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; response: NextResponse };

export async function parseJsonBody(
  request: Request,
): Promise<JsonBodyResult> {
  try {
    const body = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, message: "Request body must be a JSON object." },
          { status: 400 },
        ),
      };
    }
    return { ok: true, body: body as Record<string, unknown> };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, message: "Request body must be valid JSON." },
        { status: 400 },
      ),
    };
  }
}

export function logApiCall(request: Request, status: number): void {
  const url = new URL(request.url);
  console.log(`[api] ${request.method} ${url.pathname} → ${status}`);
}
