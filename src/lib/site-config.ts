import { cacheTag } from "next/cache";
import path from "node:path";
import { dataDir, enqueue, readJsonStore, writeJsonStoreAtomic } from "./json-store";

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

function dataFile(): string {
  return path.join(dataDir(), "site-config.json");
}

export async function getSiteConfig(): Promise<SiteConfig> {
  "use cache";
  cacheTag("site-config");
  let stored: SiteConfig | null;
  try {
    stored = await readJsonStore<SiteConfig>(dataFile(), isSiteConfig);
  } catch {
    return { ...SITE_CONFIG_DEFAULTS };
  }
  if (!stored) {
    return { ...SITE_CONFIG_DEFAULTS };
  }
  return {
    siteName: stored.siteName.trim() || SITE_CONFIG_DEFAULTS.siteName,
    tagline: stored.tagline,
    contactEmail: stored.contactEmail,
    footerText: stored.footerText || SITE_CONFIG_DEFAULTS.footerText,
  };
}

export async function saveSiteConfig(config: SiteConfig): Promise<void> {
  await enqueue(() => writeJsonStoreAtomic(dataFile(), config));
}
