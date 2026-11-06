import { cacheTag } from "next/cache";
import path from "node:path";
import type { AboutContent } from "@/data/about";
import { DEFAULT_ABOUT_CONTENT } from "@/data/about";
import { dataDir, enqueue, readJsonStore, writeJsonStoreAtomic } from "./json-store";

function dataFile(): string {
  return path.join(dataDir(), "about.json");
}

function isAboutContent(value: unknown): value is AboutContent {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.intro === "string" &&
    typeof entry.education === "string" &&
    typeof entry.experience === "string" &&
    Array.isArray(entry.skills) &&
    entry.skills.every((skill) => typeof skill === "string")
  );
}

export async function getAbout(): Promise<AboutContent> {
  "use cache";
  cacheTag("about");
  const stored = await readJsonStore<AboutContent>(dataFile(), isAboutContent);
  return stored ?? { ...DEFAULT_ABOUT_CONTENT };
}

export async function saveAbout(input: AboutContent): Promise<void> {
  return enqueue(() => writeJsonStoreAtomic(dataFile(), input));
}
