import { cacheTag, revalidateTag } from "next/cache";
import path from "node:path";
import type { Project } from "@/data/projects";
import { DEFAULT_PROJECTS } from "@/data/projects";
import { isValidHttpUrl, isValidProjectSlug } from "./validation";
import { createJsonStore, dataDir } from "./json-store";

const store = createJsonStore<Project[]>({
  file: () => path.join(dataDir(), "projects.json"),
  validate: (value): value is Project[] =>
    Array.isArray(value) && value.every(isProject),
  defaults: () => DEFAULT_PROJECTS.map((project) => ({ ...project })),
});

function isProject(value: unknown): value is Project {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.slug === "string" &&
    typeof entry.title === "string" &&
    typeof entry.summary === "string" &&
    typeof entry.description === "string" &&
    Array.isArray(entry.techStack) &&
    entry.techStack.every((t) => typeof t === "string")
  );
}

export async function getProjects(): Promise<Project[]> {
  "use cache";
  cacheTag("projects");
  return store.read();
}

export async function getProjectBySlug(slug: string): Promise<Project | undefined> {
  const projects = await getProjects();
  return projects.find((project) => project.slug === slug);
}

export interface ProjectFieldErrors {
  title?: string;
  slug?: string;
  summary?: string;
  description?: string;
  repoUrl?: string;
  liveUrl?: string;
  techStack?: string;
}

export function validateProjectInput(input: {
  title: string;
  slug: string;
  summary: string;
  description: string;
  repoUrl: string;
  liveUrl: string;
  techStack: string[];
}): ProjectFieldErrors {
  const errors: ProjectFieldErrors = {};

  if (input.title.length === 0) {
    errors.title = "Title is required.";
  } else if (input.title.length > 80) {
    errors.title = "Title must be 80 characters or fewer.";
  }

  if (input.slug.length === 0) {
    errors.slug = "Enter a slug, or use a title with letters or numbers.";
  } else if (!isValidProjectSlug(input.slug)) {
    errors.slug =
      "Slug may only contain lowercase letters, numbers, and dashes.";
  }

  if (input.summary.length === 0) {
    errors.summary = "Summary is required.";
  } else if (input.summary.length > 200) {
    errors.summary = "Summary must be 200 characters or fewer.";
  }

  if (input.description.length === 0) {
    errors.description = "Description is required.";
  } else if (input.description.length > 2000) {
    errors.description = "Description must be 2000 characters or fewer.";
  }

  if (input.repoUrl.length > 0 && !isValidHttpUrl(input.repoUrl)) {
    errors.repoUrl = "Enter a full URL starting with http:// or https://.";
  }
  if (input.liveUrl.length > 0 && !isValidHttpUrl(input.liveUrl)) {
    errors.liveUrl = "Enter a full URL starting with http:// or https://.";
  }

  if (!Array.isArray(input.techStack) || input.techStack.some((tech) => typeof tech !== "string")) {
    errors.techStack = "Tech stack must be a list of technologies.";
  }

  return errors;
}

export function parseTechStackInput(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((tech) => String(tech).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((tech) => tech.trim()).filter(Boolean);
  }
  return [];
}

export type ProjectMutationResult =
  | { ok: true; project: Project }
  | { ok: false; reason: "duplicate-slug" | "not-found" };

function revalidateProjects(): void {
  try {
    revalidateTag("projects", { expire: 0 });
  } catch {
    return;
  }
}

export async function addProject(input: Project): Promise<ProjectMutationResult> {
  const result = await store.update((current): { data: Project[]; value: ProjectMutationResult } => {
    if (current.some((project) => project.slug === input.slug)) {
      return {
        data: current,
        value: { ok: false, reason: "duplicate-slug" },
      };
    }
    return {
      data: [...current, input],
      value: { ok: true, project: input },
    };
  });
  if (result.ok) {
    revalidateProjects();
  }
  return result;
}

export async function updateProject(
  slug: string,
  input: Omit<Project, "slug">,
): Promise<ProjectMutationResult> {
  const result = await store.update((current): { data: Project[]; value: ProjectMutationResult } => {
    const index = current.findIndex((project) => project.slug === slug);
    if (index === -1) {
      return {
        data: current,
        value: { ok: false, reason: "not-found" },
      };
    }
    const updated: Project = { ...input, slug };
    const next = [...current];
    next[index] = updated;
    return {
      data: next,
      value: { ok: true, project: updated },
    };
  });
  if (result.ok) {
    revalidateProjects();
  }
  return result;
}

export type ProjectDeleteResult =
  | { ok: true }
  | { ok: false; reason: "not-found" };

export async function deleteProject(slug: string): Promise<ProjectDeleteResult> {
  const result = await store.update((current): { data: Project[]; value: ProjectDeleteResult } => {
    if (!current.some((project) => project.slug === slug)) {
      return {
        data: current,
        value: { ok: false, reason: "not-found" },
      };
    }
    return {
      data: current.filter((project) => project.slug !== slug),
      value: { ok: true },
    };
  });
  if (result.ok) {
    revalidateProjects();
  }
  return result;
}
