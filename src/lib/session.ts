import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { dataDir } from "./json-store";

const COOKIE_NAME = "admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

let cachedSecret: string | null = null;
let warnedDefaultPassword = false;

function getSessionSecret(): string {
  if (cachedSecret !== null) {
    return cachedSecret;
  }
  const fromEnv = process.env.ADMIN_SESSION_SECRET;
  if (fromEnv) {
    cachedSecret = fromEnv;
    return fromEnv;
  }
  const dir = dataDir();
  mkdirSync(dir, { recursive: true });
  const secretFile = path.join(dir, ".session-secret");
  try {
    cachedSecret = readFileSync(secretFile, "utf8").trim();
  } catch {
    const secret = randomBytes(32).toString("hex");
    try {
      writeFileSync(secretFile, secret, { flag: "wx" });
      cachedSecret = secret;
    } catch {
      cachedSecret = readFileSync(secretFile, "utf8").trim();
    }
  }
  return cachedSecret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

export function isCorrectAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || "portfolio-admin";
  if (expected === "portfolio-admin" && !warnedDefaultPassword) {
    warnedDefaultPassword = true;
    console.warn(
      "[security] ADMIN_PASSWORD is not set — using the default admin password. Set ADMIN_PASSWORD in .env for any real deployment.",
    );
  }
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function parseSessionPayload(
  payload: string,
  now: number,
): boolean {
  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { exp?: unknown };
    return typeof decoded.exp === "number" && decoded.exp > now;
  } catch {
    return false;
  }
}

export function verifySessionToken(
  token: string,
  signFn: (payload: string) => string,
  now: number = Date.now(),
): boolean {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return false;
  }
  const expected = Buffer.from(signFn(payload));
  const provided = Buffer.from(signature);
  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    return false;
  }
  return parseSessionPayload(payload, now);
}

export async function createAdminSession(): Promise<void> {
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + SESSION_TTL_MS }),
  ).toString("base64url");
  const store = await cookies();
  store.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAdmin(): Promise<boolean> {
  await connection();
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) {
    return false;
  }
  return verifySessionToken(token, sign);
}
