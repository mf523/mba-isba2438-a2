import { randomUUID } from "node:crypto";
import path from "node:path";
import { createJsonStore, dataDir } from "./json-store";
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

const store = createJsonStore<ContactSubmission[]>({
  file: () => path.join(dataDir(), "contact-submissions.json"),
  validate: (value): value is ContactSubmission[] =>
    Array.isArray(value) && value.every(isSubmission),
  defaults: () => [],
});

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

export function getContactSubmissions(): Promise<ContactSubmission[]> {
  return store.read();
}

export function saveContactSubmission(input: {
  name: string;
  email: string;
  message: string;
}): Promise<ContactSubmission> {
  return store.update((submissions) => {
    const submission: ContactSubmission = {
      id: randomUUID(),
      name: input.name.trim(),
      email: input.email.trim(),
      message: input.message.trim(),
      submittedAt: new Date().toISOString(),
    };
    return {
      data: [...submissions, submission],
      value: submission,
    };
  });
}
