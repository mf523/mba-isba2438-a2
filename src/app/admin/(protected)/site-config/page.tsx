import type { Metadata } from "next";
import { Suspense } from "react";
import { getSiteConfig } from "@/lib/site-config";
import AdminGate from "../admin-gate";
import SiteConfigForm from "./site-config-form";

export const metadata: Metadata = {
  title: "Site Config",
};

async function SiteConfigContent() {
  const config = await getSiteConfig();

  return (
    <>
      <p>
        Website settings used across the portfolio. Saving updates the site
        name and footer text everywhere immediately.
      </p>
      <SiteConfigForm config={config} />
    </>
  );
}

export default function SiteConfigPage() {
  return (
    <>
      <h1>Site config</h1>
      <Suspense fallback={null}>
        <AdminGate>
          <SiteConfigContent />
        </AdminGate>
      </Suspense>
    </>
  );
}
