import type { Metadata } from "next";
import { getSiteConfig } from "@/lib/site-config";
import AdminPage from "../admin-page";
import SiteConfigForm from "./site-config-form";

export const metadata: Metadata = {
  title: "Site Config",
};

async function SiteConfigContent() {
  const config = await getSiteConfig();

  return <SiteConfigForm config={config} />;
}

export default function SiteConfigPage() {
  return (
    <AdminPage
      title="Site config"
      intro="Website settings used across the portfolio. Saving updates the site name and footer text everywhere immediately."
    >
      <SiteConfigContent />
    </AdminPage>
  );
}
