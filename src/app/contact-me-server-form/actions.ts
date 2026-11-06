"use server";

import {
  saveContactSubmission,
  validateContactInput,
} from "@/lib/contact-submissions";
import type { ContactFormState } from "./form-state";

export async function submitContact(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const input = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    message: String(formData.get("message") ?? ""),
  };

  const fieldErrors = validateContactInput(input);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Please fix the highlighted fields and try again.",
      fieldErrors,
    };
  }

  try {
    await saveContactSubmission(input);
    return {
      status: "success",
      message: "Your message has been sent. Thank you!",
      fieldErrors: {},
    };
  } catch {
    return {
      status: "error",
      message:
        "Something went wrong while sending your message. Please try again.",
      fieldErrors: {},
    };
  }
}
