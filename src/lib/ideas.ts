import path from "node:path";
import {
  DEFAULT_IDEAS,
  isIdeaOrigin,
  isIdeaStatus,
  isIdeaTargetType,
  type Idea,
  type IdeaOrigin,
  type IdeaTargetType,
} from "@/data/ideas";
import { createJsonStore, dataDir } from "./json-store";

export {
  validateIdeaInput,
  type IdeaFieldErrors,
} from "@/data/ideas";

const store = createJsonStore<Idea[]>({
  file: () => path.join(dataDir(), "ideas.json"),
  validate: (value): value is Idea[] =>
    Array.isArray(value) && value.every(isIdea),
  defaults: () => DEFAULT_IDEAS.map((idea) => ({ ...idea })),
});

function isIdea(value: unknown): value is Idea {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    entry.id.length > 0 &&
    typeof entry.title === "string" &&
    typeof entry.summary === "string" &&
    typeof entry.body === "string" &&
    isIdeaTargetType(entry.targetType) &&
    isIdeaOrigin(entry.origin) &&
    (entry.imagePrompt === undefined || typeof entry.imagePrompt === "string") &&
    (entry.imageUrl === undefined || typeof entry.imageUrl === "string") &&
    (entry.status === undefined || isIdeaStatus(entry.status)) &&
    (entry.usedAs === undefined ||
      (Array.isArray(entry.usedAs) &&
        entry.usedAs.every(
          (link) =>
            typeof link === "object" &&
            link !== null &&
            isIdeaTargetType((link as Record<string, unknown>).type) &&
            typeof (link as Record<string, unknown>).title === "string" &&
            typeof (link as Record<string, unknown>).href === "string",
        ))) &&
    typeof entry.createdAt === "string" &&
    typeof entry.updatedAt === "string"
  );
}

export function markIdeaUsed(
  id: string,
  link: { type: IdeaTargetType; title: string; href: string },
): Promise<Idea | undefined> {
  return store.update((current) => {
    const existing = current.find((idea) => idea.id === id);
    if (!existing) {
      return { data: current, value: undefined };
    }
    const usedAs = (existing.usedAs ?? []).filter(
      (candidate) => candidate.href !== link.href,
    );
    const updated: Idea = {
      ...existing,
      status: "used",
      usedAs: [...usedAs, link],
      updatedAt: new Date().toISOString(),
    };
    return {
      data: current.map((idea) => (idea.id === id ? updated : idea)),
      value: updated,
    };
  });
}

export function listIdeas(): Promise<Idea[]> {
  return store.read();
}

export function isUsableIdeaId(id: string): boolean {
  return /^[a-zA-Z0-9-]{1,100}$/.test(id.trim());
}

export async function getIdeaById(id: string): Promise<Idea | undefined> {
  const ideas = await listIdeas();
  return ideas.find((idea) => idea.id === id);
}

export function addIdea(
  input: { title: string; summary: string; body: string; targetType: IdeaTargetType; origin: IdeaOrigin },
): Promise<Idea> {
  return store.update((current) => {
    const now = new Date().toISOString();
    const idea: Idea = {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      summary: input.summary.trim(),
      body: input.body.trim(),
      targetType: input.targetType,
      origin: input.origin,
      createdAt: now,
      updatedAt: now,
    };
    return {
      data: [...current, idea],
      value: idea,
    };
  });
}

export function updateIdea(
  id: string,
  input: { title: string; summary: string; body: string; targetType: IdeaTargetType },
): Promise<Idea | undefined> {
  return store.update((current) => {
    const existing = current.find((idea) => idea.id === id);
    if (!existing) {
      return { data: current, value: undefined };
    }
    const updated: Idea = {
      ...existing,
      title: input.title.trim(),
      summary: input.summary.trim(),
      body: input.body.trim(),
      targetType: input.targetType,
      updatedAt: new Date().toISOString(),
    };
    return {
      data: current.map((idea) => (idea.id === id ? updated : idea)),
      value: updated,
    };
  });
}

export function updateIdeaImage(
  id: string,
  fields: { imagePrompt?: string; imageUrl?: string },
): Promise<Idea | undefined> {
  return store.update((current) => {
    const existing = current.find((idea) => idea.id === id);
    if (!existing) {
      return { data: current, value: undefined };
    }
    const updated: Idea = {
      ...existing,
      ...(fields.imagePrompt !== undefined ? { imagePrompt: fields.imagePrompt } : {}),
      ...(fields.imageUrl !== undefined ? { imageUrl: fields.imageUrl } : {}),
      updatedAt: new Date().toISOString(),
    };
    return {
      data: current.map((idea) => (idea.id === id ? updated : idea)),
      value: updated,
    };
  });
}

export function deleteIdea(id: string): Promise<boolean> {
  return store.update((current) => {
    const exists = current.some((idea) => idea.id === id);
    return {
      data: current.filter((idea) => idea.id !== id),
      value: exists,
    };
  });
}
