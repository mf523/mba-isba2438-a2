import { cacheTag } from "next/cache";
import path from "node:path";
import type { AboutContent } from "@/data/about";
import { DEFAULT_ABOUT_CONTENT } from "@/data/about";
import { createJsonStore, dataDir } from "./json-store";

const store = createJsonStore<AboutContent>({
  file: () => path.join(dataDir(), "about.json"),
  validate: (value): value is AboutContent => isAboutContent(value),
  defaults: () => ({ ...DEFAULT_ABOUT_CONTENT }),
});

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
  return store.read();
}

export function saveAbout(input: AboutContent): Promise<void> {
  return store.write(input);
}
