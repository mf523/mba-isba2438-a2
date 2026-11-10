import path from "node:path";
import type { Blog } from "@/data/blogs";
import { DEFAULT_BLOGS } from "@/data/blogs";
import { isValidProjectSlug } from "./validation";
import { dataDir, enqueue, readJsonStore, writeJsonStoreAtomic } from "./json-store";

function dataFile(): string {
  return path.join(dataDir(), "blogs.json");
}

function isBlog(value: unknown): value is Blog {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.slug === "string" &&
    typeof entry.title === "string" &&
    typeof entry.summary === "string" &&
    typeof entry.content === "string" &&
    typeof entry.publishedAt === "string"
  );
}

export async function getBlogs(): Promise<Blog[]> {
  const stored = await readJsonStore<Blog[]>(
    dataFile(),
    (value) => Array.isArray(value) && value.every(isBlog),
  );
  return stored ?? DEFAULT_BLOGS.map((blog) => ({ ...blog }));
}

export async function getBlogBySlug(slug: string): Promise<Blog | undefined> {
  const blogs = await getBlogs();
  return blogs.find((blog) => blog.slug === slug);
}

export type AddBlogResult =
  | { ok: true; blog: Blog }
  | { ok: false; reason: "duplicate-slug" };

export async function addBlog(
  input: Omit<Blog, "publishedAt">,
): Promise<AddBlogResult> {
  return enqueue(async () => {
    const existing = await getBlogs();
    if (existing.some((blog) => blog.slug === input.slug)) {
      return { ok: false as const, reason: "duplicate-slug" as const };
    }
    const blog: Blog = {
      ...input,
      publishedAt: new Date().toISOString(),
    };
    await writeJsonStoreAtomic(dataFile(), [...existing, blog]);
    return { ok: true as const, blog };
  });
}

export interface BlogFieldErrors {
  title?: string;
  slug?: string;
  summary?: string;
  content?: string;
}

export function validateBlogInput(input: {
  title: string;
  slug: string;
  summary: string;
  content: string;
}): BlogFieldErrors {
  const errors: BlogFieldErrors = {};

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

  if (input.content.length === 0) {
    errors.content = "Content is required.";
  } else if (input.content.length > 5000) {
    errors.content = "Content must be 5000 characters or fewer.";
  }

  return errors;
}
