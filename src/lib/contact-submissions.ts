import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  message: string;
  submittedAt: string;
}

export interface ContactFieldErrors {
  name?: string;
  email?: string;
  message?: string;
}

function dataDir(): string {
  return process.env.CONTACT_SUBMISSIONS_DIR ?? path.join(process.cwd(), "data");
}

function dataFile(): string {
  return path.join(dataDir(), "contact-submissions.json");
}

export function validateContactInput(input: {
  name: string;
  email: string;
  message: string;
}): ContactFieldErrors {
  const errors: ContactFieldErrors = {};

  if (input.name.trim().length === 0) {
    errors.name = "Name is required.";
  }

  if (input.email.trim().length === 0) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (input.message.trim().length === 0) {
    errors.message = "Message is required.";
  }

  return errors;
}

function isSubmission(value: unknown): value is ContactSubmission {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.name === "string" &&
    typeof entry.email === "string" &&
    typeof entry.message === "string" &&
    typeof entry.submittedAt === "string"
  );
}

function parseSubmissions(raw: string, file: string): ContactSubmission[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Contact submissions store is corrupt: ${file}`);
  }
  if (!Array.isArray(parsed) || !parsed.every(isSubmission)) {
    throw new Error(`Contact submissions store is corrupt: ${file}`);
  }
  return parsed;
}

function isEnoent(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}

async function readSubmissions(): Promise<ContactSubmission[]> {
  let raw: string;
  try {
    raw = await readFile(dataFile(), "utf8");
  } catch (error) {
    if (isEnoent(error)) {
      return [];
    }
    throw error;
  }
  return parseSubmissions(raw, dataFile());
}

let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(task, task);
  writeQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function saveContactSubmission(input: {
  name: string;
  email: string;
  message: string;
}): Promise<ContactSubmission> {
  return enqueue(async () => {
    const submission: ContactSubmission = {
      id: randomUUID(),
      name: input.name.trim(),
      email: input.email.trim(),
      message: input.message.trim(),
      submittedAt: new Date().toISOString(),
    };

    const submissions = [...(await readSubmissions()), submission];

    await mkdir(dataDir(), { recursive: true });
    const tempFile = `${dataFile()}.${randomUUID()}.tmp`;
    try {
      await writeFile(tempFile, JSON.stringify(submissions, null, 2), "utf8");
      await rename(tempFile, dataFile());
    } catch (error) {
      await rm(tempFile, { force: true });
      throw error;
    }

    return submission;
  });
}
