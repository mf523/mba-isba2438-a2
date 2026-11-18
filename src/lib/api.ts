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

export const MAX_BODY_BYTES = 1024 * 1024;

export function bodySizeResponse(request: Request): NextResponse | null {
  const header = request.headers.get("content-length");
  const size = header ? Number(header) : 0;
  if (Number.isFinite(size) && size > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, message: "Request body is too large." },
      { status: 413 },
    );
  }
  return null;
}

export async function parseJsonBody(
  request: Request,
): Promise<JsonBodyResult> {
  const tooLarge = bodySizeResponse(request);
  if (tooLarge) {
    return { ok: false, response: tooLarge };
  }
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

type RouteContext = unknown;

export function withRoute<C = RouteContext>(
  handler: (request: Request, context: C) => Promise<Response>,
): (request: Request, context: C) => Promise<Response> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      console.error(
        `[api] ${request.method} ${new URL(request.url).pathname} failed:`,
        error,
      );
      logApiCall(request, 500);
      return NextResponse.json(
        { ok: false, message: "Internal server error." },
        { status: 500 },
      );
    }
  };
}
