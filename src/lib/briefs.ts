export interface Brief {
  id: string;
  title: string;
  contentType: BriefContentType;
  audience: string;
  tone: BriefTone;
  keyPoints: string;
  createdAt: string;
  updatedAt: string;
}

export type BriefContentType = "blog-post" | "project";
export type BriefTone = "friendly" | "professional" | "technical";

export const BRIEFS_STORAGE_KEY = "mba-isba2438-a2:briefs";

export const CONTENT_TYPE_OPTIONS: { value: BriefContentType; label: string }[] = [
  { value: "blog-post", label: "Blog post" },
  { value: "project", label: "Project" },
];

export const TONE_OPTIONS: { value: BriefTone; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "technical", label: "Technical" },
];

const CONTENT_TYPE_VALUES = CONTENT_TYPE_OPTIONS.map((option) => option.value);
const TONE_VALUES = TONE_OPTIONS.map((option) => option.value);

export interface BriefFieldErrors {
  title?: string;
  contentType?: string;
  audience?: string;
  tone?: string;
  keyPoints?: string;
}

export function validateBriefInput(input: {
  title: string;
  contentType: string;
  audience: string;
  tone: string;
  keyPoints: string;
}): BriefFieldErrors {
  const errors: BriefFieldErrors = {};

  if (input.title.trim().length === 0) {
    errors.title = "Working title is required.";
  } else if (input.title.trim().length > 80) {
    errors.title = "Working title must be 80 characters or fewer.";
  }

  if (!CONTENT_TYPE_VALUES.includes(input.contentType as BriefContentType)) {
    errors.contentType = "Choose a content type.";
  }

  if (input.audience.trim().length === 0) {
    errors.audience = "Audience is required.";
  } else if (input.audience.trim().length > 120) {
    errors.audience = "Audience must be 120 characters or fewer.";
  }

  if (!TONE_VALUES.includes(input.tone as BriefTone)) {
    errors.tone = "Choose a tone.";
  }

  if (input.keyPoints.trim().length === 0) {
    errors.keyPoints = "Add at least one key point.";
  } else if (input.keyPoints.trim().length > 2000) {
    errors.keyPoints = "Key points must be 2000 characters or fewer.";
  }

  return errors;
}

function isBrief(value: unknown): value is Brief {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    entry.id.length > 0 &&
    typeof entry.title === "string" &&
    CONTENT_TYPE_VALUES.includes(entry.contentType as BriefContentType) &&
    typeof entry.audience === "string" &&
    TONE_VALUES.includes(entry.tone as BriefTone) &&
    typeof entry.keyPoints === "string" &&
    isIsoDate(entry.createdAt) &&
    isIsoDate(entry.updatedAt)
  );
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function serializeBriefs(briefs: Brief[]): string {
  return JSON.stringify(briefs);
}

export interface BriefsStorageState {
  briefs: Brief[];
  usable: boolean;
  dropped: number;
}

export function readBriefsStorage(raw: string | null): BriefsStorageState {
  if (raw === null || raw.trim().length === 0) {
    return { briefs: [], usable: true, dropped: 0 };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { briefs: [], usable: false, dropped: 0 };
  }
  if (!Array.isArray(parsed)) {
    return { briefs: [], usable: false, dropped: 0 };
  }
  const briefs = parsed.filter(isBrief);
  return {
    briefs,
    usable: briefs.length === parsed.length,
    dropped: parsed.length - briefs.length,
  };
}

export function sortBriefsNewestFirst(briefs: Brief[]): Brief[] {
  return [...briefs].sort(
    (a, b) =>
      Date.parse(b.updatedAt) - Date.parse(a.updatedAt) ||
      Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}
