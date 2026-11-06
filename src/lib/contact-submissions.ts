import { randomUUID } from "node:crypto";
import path from "node:path";
import { dataDir, enqueue, readJsonStore, writeJsonStoreAtomic } from "./json-store";
import { isValidEmail } from "./validation";

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

function dataFile(): string {
  return path.join(dataDir(), "contact-submissions.json");
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
  } else if (!isValidEmail(input.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (input.message.trim().length === 0) {
    errors.message = "Message is required.";
  }

  return errors;
}

export async function getContactSubmissions(): Promise<ContactSubmission[]> {
  const stored = await readJsonStore<ContactSubmission[]>(
    dataFile(),
    (value) => Array.isArray(value) && value.every(isSubmission),
  );
  return stored ?? [];
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

    const submissions = [...(await getContactSubmissions()), submission];
    await writeJsonStoreAtomic(dataFile(), submissions);

    return submission;
  });
}
