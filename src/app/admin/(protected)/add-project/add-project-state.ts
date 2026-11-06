export interface AddProjectFormState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: {
    title?: string;
    slug?: string;
    summary?: string;
    description?: string;
    techStack?: string;
    repoUrl?: string;
    liveUrl?: string;
  };
  projectSlug?: string;
}

export const initialAddProjectFormState: AddProjectFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
