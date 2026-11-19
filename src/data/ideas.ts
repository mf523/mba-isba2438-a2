export type IdeaTargetType = "blog-post" | "project";
export type IdeaOrigin = "hand" | "assistant" | "assistant-image";
export type IdeaStatus = "draft" | "used";

export interface IdeaUsedLink {
  type: IdeaTargetType;
  title: string;
  href: string;
}

export interface Idea {
  id: string;
  title: string;
  summary: string;
  body: string;
  targetType: IdeaTargetType;
  origin: IdeaOrigin;
  imagePrompt?: string;
  imageUrl?: string;
  status?: IdeaStatus;
  usedAs?: IdeaUsedLink[];
  createdAt: string;
  updatedAt: string;
}

export const IDEA_TARGET_TYPE_OPTIONS: { value: IdeaTargetType; label: string }[] = [
  { value: "blog-post", label: "Blog post" },
  { value: "project", label: "Project" },
];

export const IDEA_ORIGIN_LABELS: Record<IdeaOrigin, string> = {
  hand: "Written by hand",
  assistant: "Suggested by the assistant",
  "assistant-image": "Suggested from an image",
};

export function isIdeaStatus(value: unknown): value is IdeaStatus {
  return value === "draft" || value === "used";
}

export const DEFAULT_IDEAS: Idea[] = [
  {
    id: "idea-component-library",
    title: "Component library write-up",
    summary: "How the studio's repeated UI became shared components.",
    body: "Trace one component from inline markup to shared component: what repeated, what varied, and how props shaped the interface. Include the before and after side by side.",
    targetType: "blog-post",
    origin: "hand",
    createdAt: "2026-11-13T09:00:00.000Z",
    updatedAt: "2026-11-13T09:00:00.000Z",
  },
  {
    id: "idea-brief-to-post",
    title: "Brief to published piece",
    summary: "A walkthrough of the brief, assistant, idea, post pipeline.",
    body: "Follow one piece of content through the whole studio: a brief in the browser, an assistant suggestion, an idea on the server, and the published post. Note where a human decided and where the assistant helped.",
    targetType: "project",
    origin: "hand",
    createdAt: "2026-11-13T09:05:00.000Z",
    updatedAt: "2026-11-13T09:05:00.000Z",
  },
];

export function isIdeaTargetType(value: unknown): value is IdeaTargetType {
  return value === "blog-post" || value === "project";
}

export function isIdeaOrigin(value: unknown): value is IdeaOrigin {
  return value === "hand" || value === "assistant" || value === "assistant-image";
}

export interface IdeaFieldErrors {
  title?: string;
  summary?: string;
  body?: string;
  targetType?: string;
}

export function validateIdeaInput(input: {
  title: string;
  summary: string;
  body: string;
  targetType: string;
}): IdeaFieldErrors {
  const errors: IdeaFieldErrors = {};

  if (input.title.trim().length === 0) {
    errors.title = "Title is required.";
  } else if (input.title.trim().length > 80) {
    errors.title = "Title must be 80 characters or fewer.";
  }

  if (input.summary.trim().length === 0) {
    errors.summary = "Summary is required.";
  } else if (input.summary.trim().length > 200) {
    errors.summary = "Summary must be 200 characters or fewer.";
  }

  if (input.body.trim().length === 0) {
    errors.body = "Body is required.";
  } else if (input.body.trim().length > 5000) {
    errors.body = "Body must be 5000 characters or fewer.";
  }

  if (!isIdeaTargetType(input.targetType)) {
    errors.targetType = "Choose what this idea becomes.";
  }

  return errors;
}
