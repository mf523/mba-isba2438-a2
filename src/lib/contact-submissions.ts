import { randomUUID } from "node:crypto";
import path from "node:path";
import { createJsonStore, dataDir } from "./json-store";
import { isValidEmail } from "./validation";

export type ContactStatus = "new" | "archived";

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  message: string;
  status: ContactStatus;
  submittedAt: string;
}

export interface ContactFieldErrors {
  name?: string;
  email?: string;
  message?: string;
  status?: string;
}

export function isContactStatus(value: unknown): value is ContactStatus {
  return value === "new" || value === "archived";
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
    typeof entry.submittedAt === "string" &&
    (entry.status === undefined || isContactStatus(entry.status))
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
  return store.read().then((submissions) =>
    submissions.map((submission) => ({
      ...submission,
      status: submission.status ?? "new",
    })),
  );
}

export async function getContactSubmissionById(
  id: string,
): Promise<ContactSubmission | undefined> {
  const submissions = await getContactSubmissions();
  return submissions.find((submission) => submission.id === id);
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
      status: "new",
      submittedAt: new Date().toISOString(),
    };
    return {
      data: [...submissions, submission],
      value: submission,
    };
  });
}

export type ContactUpdateResult =
  | { ok: true; submission: ContactSubmission }
  | { ok: false; reason: "not-found" };

export async function updateContactSubmission(
  id: string,
  status: ContactStatus,
): Promise<ContactUpdateResult> {
  return store.update((current): { data: ContactSubmission[]; value: ContactUpdateResult } => {
    const index = current.findIndex((submission) => submission.id === id);
    if (index === -1) {
      return {
        data: current,
        value: { ok: false, reason: "not-found" },
      };
    }
    const updated: ContactSubmission = { ...current[index], status };
    const next = [...current];
    next[index] = updated;
    return {
      data: next,
      value: { ok: true, submission: updated },
    };
  });
}

export type ContactDeleteResult =
  | { ok: true }
  | { ok: false; reason: "not-found" };

export async function deleteContactSubmission(
  id: string,
): Promise<ContactDeleteResult> {
  return store.update((current): { data: ContactSubmission[]; value: ContactDeleteResult } => {
    if (!current.some((submission) => submission.id === id)) {
      return {
        data: current,
        value: { ok: false, reason: "not-found" },
      };
    }
    return {
      data: current.filter((submission) => submission.id !== id),
      value: { ok: true },
    };
  });
}
