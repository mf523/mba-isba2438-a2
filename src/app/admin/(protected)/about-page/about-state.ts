export interface AboutFormState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: {
    intro?: string;
    skills?: string;
    education?: string;
    experience?: string;
  };
}

export const initialAboutFormState: AboutFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
