import { cacheTag } from "next/cache";
import path from "node:path";
import type { SiteConfig } from "@/data/site-config";
import { SITE_CONFIG_DEFAULTS } from "@/data/site-config";
import { createJsonStore, dataDir } from "./json-store";

const store = createJsonStore<SiteConfig>({
  file: () => path.join(dataDir(), "site-config.json"),
  validate: (value): value is SiteConfig => isSiteConfig(value),
  defaults: () => ({ ...SITE_CONFIG_DEFAULTS }),
});

function isSiteConfig(value: unknown): value is SiteConfig {
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

export async function getSiteConfig(): Promise<SiteConfig> {
  "use cache";
  cacheTag("site-config");
  return store.read();
}

export function saveSiteConfig(input: SiteConfig): Promise<void> {
  return store.write(input);
}
