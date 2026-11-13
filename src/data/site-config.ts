export interface SiteConfig {
  siteName: string;
  tagline: string;
  contactEmail: string;
  footerText: string;
}

export const SITE_CONFIG_DEFAULTS: SiteConfig = {
  siteName: "My Portfolio",
  tagline: "Software developer portfolio",
  contactEmail: "",
  footerText: "My Portfolio",
};

export function isSiteConfig(value: unknown): value is SiteConfig {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.siteName === "string" &&
    typeof entry.tagline === "string" &&
    typeof entry.contactEmail === "string" &&
    typeof entry.footerText === "string"
  );
}
