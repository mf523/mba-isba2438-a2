"use server";

import { updateTag } from "next/cache";
import { isValidEmail } from "@/lib/validation";
import { saveSiteConfig } from "@/lib/site-config";
import type { SiteConfigFormState } from "./site-config-state";

interface ParsedSiteConfigInput {
  siteName: string;
  tagline: string;
  contactEmail: string;
  footerText: string;
}

function parseInput(formData: FormData): ParsedSiteConfigInput {
  return {
    siteName: String(formData.get("siteName") ?? ""),
    tagline: String(formData.get("tagline") ?? ""),
    contactEmail: String(formData.get("contactEmail") ?? ""),
    footerText: String(formData.get("footerText") ?? ""),
  };
}

export async function saveSiteConfigAction(
  _prevState: SiteConfigFormState,
  formData: FormData,
): Promise<SiteConfigFormState> {
  const input = parseInput(formData);
  const fieldErrors: SiteConfigFormState["fieldErrors"] = {};

  if (input.siteName.trim().length === 0) {
    fieldErrors.name = "Site name is required.";
  }
  if (input.contactEmail.trim().length > 0 && !isValidEmail(input.contactEmail)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Please fix the highlighted fields and try again.",
      fieldErrors,
    };
  }

  try {
    await saveSiteConfig({
      siteName: input.siteName.trim(),
      tagline: input.tagline.trim(),
      contactEmail: input.contactEmail.trim(),
      footerText: input.footerText.trim(),
    });
    updateTag("site-config");
    return {
      status: "success",
      message: "Site settings saved.",
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
