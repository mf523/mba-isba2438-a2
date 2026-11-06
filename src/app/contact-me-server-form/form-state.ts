import type { ContactFieldErrors } from "@/lib/contact-submissions";

export interface ContactFormState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: ContactFieldErrors;
}

export const initialContactFormState: ContactFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
