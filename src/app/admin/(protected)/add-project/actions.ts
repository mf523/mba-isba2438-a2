"use server";

import { updateTag } from "next/cache";
import { addProject } from "@/lib/projects";
import type { AddProjectFormState } from "./add-project-state";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isOptionalHttpUrl(value: string): boolean {
  if (value.length === 0) {
    return true;
  }
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function addProjectAction(
  _prevState: AddProjectFormState,
  formData: FormData,
): Promise<AddProjectFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const techStackInput = String(formData.get("techStack") ?? "").trim();
  const repoUrl = String(formData.get("repoUrl") ?? "").trim();
  const liveUrl = String(formData.get("liveUrl") ?? "").trim();

  const fieldErrors: AddProjectFormState["fieldErrors"] = {};

  if (title.length === 0) {
    fieldErrors.title = "Title is required.";
  } else if (title.length > 80) {
    fieldErrors.title = "Title must be 80 characters or fewer.";
  }

  const slug = slugInput.length > 0 ? slugify(slugInput) : slugify(title);
  if (slug.length === 0) {
    fieldErrors.slug = "Enter a slug, or use a title with letters or numbers.";
  } else if (slug.length > 64) {
    fieldErrors.slug = "Slug must be 64 characters or fewer.";
  } else if (!SLUG_PATTERN.test(slug)) {
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

  const techStack = techStackInput
    .split(",")
    .map((tech) => tech.trim())
    .filter((tech) => tech.length > 0);

  if (!isOptionalHttpUrl(repoUrl)) {
    fieldErrors.repoUrl = "Enter a full URL starting with http:// or https://.";
  }
  if (!isOptionalHttpUrl(liveUrl)) {
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

  updateTag("projects");

  return {
    status: "success",
    message: `Project added. View it at /projects/${slug}.`,
    fieldErrors: {},
    projectSlug: slug,
  };
}
