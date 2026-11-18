import type { Metadata } from "next";
import { getAbout } from "@/lib/about";
import AdminPage from "../admin-page";
import AboutForm from "./about-form";

export const metadata: Metadata = {
  title: "Edit About Page",
};

async function AboutPageContent() {
  const about = await getAbout();

  return <AboutForm content={about} />;
}

export default function AboutPageAdmin() {
  return (
    <AdminPage
      title="Edit About page"
      intro="Edit the text shown on the About Me page. Saving updates the page immediately."
    >
      <AboutPageContent />
    </AdminPage>
  );
}
