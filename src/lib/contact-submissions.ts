import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "contact-submissions.json");

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

async function readSubmissions(): Promise<ContactSubmission[]> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ContactSubmission[]) : [];
  } catch {
    return [];
  }
}

export async function saveContactSubmission(input: {
  name: string;
  email: string;
  message: string;
}): Promise<ContactSubmission> {
  const submission: ContactSubmission = {
    id: randomUUID(),
    name: input.name.trim(),
    email: input.email.trim(),
    message: input.message.trim(),
    submittedAt: new Date().toISOString(),
  };

  const submissions = await readSubmissions();
  submissions.push(submission);

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(submissions, null, 2), "utf8");

  return submission;
}
