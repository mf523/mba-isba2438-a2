import { cacheTag } from "next/cache";
import path from "node:path";
import type { Project } from "@/data/projects";
import { DEFAULT_PROJECTS } from "@/data/projects";
import { dataDir, enqueue, readJsonStore, writeJsonStoreAtomic } from "./json-store";

function dataFile(): string {
  return path.join(dataDir(), "projects.json");
}

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
  const stored = await readJsonStore<Project[]>(
    dataFile(),
    (value) => Array.isArray(value) && value.every(isProject),
  );
  return stored ?? DEFAULT_PROJECTS.map((project) => ({ ...project }));
}

export async function getProjectBySlug(slug: string): Promise<Project | undefined> {
  const projects = await getProjects();
  return projects.find((project) => project.slug === slug);
}

export type AddProjectResult =
  | { ok: true; project: Project }
  | { ok: false; reason: "duplicate-slug" };

export async function addProject(input: Project): Promise<AddProjectResult> {
  return enqueue(async () => {
    const existing = await getProjects();
    if (existing.some((project) => project.slug === input.slug)) {
      return { ok: false as const, reason: "duplicate-slug" as const };
    }
    await writeJsonStoreAtomic(dataFile(), [...existing, input]);
    return { ok: true as const, project: input };
  });
}
