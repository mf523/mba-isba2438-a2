import type { ContactFieldErrors } from "@/lib/contact-submissions";

export interface ContactFormState {
  sequence: number;
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: ContactFieldErrors;
}

export const initialContactFormState: ContactFormState = {
  sequence: 0,
  status: "idle",
  message: "",
  fieldErrors: {},
};
