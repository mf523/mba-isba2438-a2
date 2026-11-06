"use server";

import { updateTag } from "next/cache";
import { saveAbout } from "@/lib/about";
import type { AboutFormState } from "./about-state";

const FIELD_LIMIT = 1000;

function parseField(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function parseSkills(formData: FormData): string[] {
  return String(formData.get("skills") ?? "")
    .split(",")
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 0);
}

export async function saveAboutAction(
  _prevState: AboutFormState,
  formData: FormData,
): Promise<AboutFormState> {
  const intro = parseField(formData, "intro");
  const education = parseField(formData, "education");
  const experience = parseField(formData, "experience");
  const skills = parseSkills(formData);

  const fieldErrors: AboutFormState["fieldErrors"] = {};

  if (intro.length === 0) {
    fieldErrors.intro = "Intro is required.";
  } else if (intro.length > FIELD_LIMIT) {
    fieldErrors.intro = `Intro must be ${FIELD_LIMIT} characters or fewer.`;
  }
  const hasLongSkill = skills.some((skill) => skill.length > 40);
  if (hasLongSkill) {
    fieldErrors.skills = "Each skill must be 40 characters or fewer.";
  }
  if (education.length === 0) {
    fieldErrors.education = "Education is required.";
  } else if (education.length > FIELD_LIMIT) {
    fieldErrors.education = `Education must be ${FIELD_LIMIT} characters or fewer.`;
  }
  if (experience.length === 0) {
    fieldErrors.experience = "Experience is required.";
  } else if (experience.length > FIELD_LIMIT) {
    fieldErrors.experience = `Experience must be ${FIELD_LIMIT} characters or fewer.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Please fix the highlighted fields and try again.",
      fieldErrors,
    };
  }

  try {
    await saveAbout({ intro, skills, education, experience });
    updateTag("about");
    return {
      status: "success",
      message: "About page updated.",
      fieldErrors: {},
    };
  } catch {
    return {
      status: "error",
      message: "Something went wrong while saving. Please try again.",
      fieldErrors: {},
    };
  }
}
