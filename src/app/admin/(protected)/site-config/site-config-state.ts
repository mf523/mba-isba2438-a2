import type { ContactFieldErrors } from "@/lib/contact-submissions";

export interface SiteConfigFormState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: Omit<ContactFieldErrors, "message">;
}

export const initialSiteConfigFormState: SiteConfigFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
