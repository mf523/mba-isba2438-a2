export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@([^\s@.]+\.)+[^\s@.]+$/.test(value.trim());
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidProjectSlug(value: string): boolean {
  return SLUG_PATTERN.test(value) && value.length <= 64;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
