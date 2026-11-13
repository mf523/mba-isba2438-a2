import { cacheTag } from "next/cache";
import path from "node:path";
import type { Project } from "@/data/projects";
import { DEFAULT_PROJECTS } from "@/data/projects";
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

export type AddProjectResult =
  | { ok: true; project: Project }
  | { ok: false; reason: "duplicate-slug" };

export function addProject(input: Project): Promise<AddProjectResult> {
  return store.update((current): { data: Project[]; value: AddProjectResult } => {
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
}
