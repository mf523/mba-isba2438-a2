"use server";

import { revalidateTag } from "next/cache";
import { addProject } from "@/lib/projects";
import {
  isValidHttpUrl,
  isValidProjectSlug,
  slugify,
} from "@/lib/validation";
import type { AddProjectFormState } from "./add-project-state";

function parseInput(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function parseTechStack(value: string): string[] {
  return value
    .split(",")
    .map((tech) => tech.trim())
    .filter((tech) => tech.length > 0);
}

export async function addProjectAction(
  _prevState: AddProjectFormState,
  formData: FormData,
): Promise<AddProjectFormState> {
  const title = parseInput(formData, "title");
  const slugInput = parseInput(formData, "slug");
  const summary = parseInput(formData, "summary");
  const description = parseInput(formData, "description");
  const repoUrl = parseInput(formData, "repoUrl");
  const liveUrl = parseInput(formData, "liveUrl");
  const techStack = parseTechStack(parseInput(formData, "techStack"));

  const fieldErrors: AddProjectFormState["fieldErrors"] = {};

  if (title.length === 0) {
    fieldErrors.title = "Title is required.";
  } else if (title.length > 80) {
    fieldErrors.title = "Title must be 80 characters or fewer.";
  }

  const slug = slugInput.length > 0 ? slugify(slugInput) : slugify(title);
  if (slug.length === 0) {
    fieldErrors.slug = "Enter a slug, or use a title with letters or numbers.";
  } else if (!isValidProjectSlug(slug)) {
    fieldErrors.slug =
      "Slug may only contain lowercase letters, numbers, and dashes.";
  }

  if (summary.length === 0) {
    fieldErrors.summary = "Summary is required.";
  } else if (summary.length > 200) {
    fieldErrors.summary = "Summary must be 200 characters or fewer.";
  }

  if (description.length === 0) {
    fieldErrors.description = "Description is required.";
  } else if (description.length > 2000) {
    fieldErrors.description = "Description must be 2000 characters or fewer.";
  }

  if (repoUrl.length > 0 && !isValidHttpUrl(repoUrl)) {
    fieldErrors.repoUrl = "Enter a full URL starting with http:// or https://.";
  }
  if (liveUrl.length > 0 && !isValidHttpUrl(liveUrl)) {
    fieldErrors.liveUrl = "Enter a full URL starting with http:// or https://.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Please fix the highlighted fields and try again.",
      fieldErrors,
    };
  }

  const result = await addProject({
    slug,
    title,
    summary,
    description,
    techStack,
    ...(repoUrl ? { repoUrl } : {}),
    ...(liveUrl ? { liveUrl } : {}),
  });

  if (!result.ok) {
    return {
      status: "error",
      message: "Please fix the highlighted fields and try again.",
      fieldErrors: {
        slug: "A project with this slug already exists.",
      },
    };
  }

  revalidateTag("projects", { expire: 0 });

  return {
    status: "success",
    message: `Project added. View it at /projects/${slug}.`,
    fieldErrors: {},
    projectSlug: slug,
  };
}
