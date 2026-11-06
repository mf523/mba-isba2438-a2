import type { Metadata } from "next";
import { Suspense } from "react";
import { getAbout } from "@/lib/about";
import AdminGate from "../admin-gate";
import AboutForm from "./about-form";

export const metadata: Metadata = {
  title: "Edit About Page",
};

async function AboutPageContent() {
  const about = await getAbout();

  return (
    <>
      <p>
        Edit the text shown on the About Me page. Saving updates the page
        immediately.
      </p>
      <AboutForm content={about} />
    </>
  );
}

export default function AboutPageAdmin() {
  return (
    <>
      <h1>Edit About page</h1>
      <Suspense fallback={null}>
        <AdminGate>
          <AboutPageContent />
        </AdminGate>
      </Suspense>
    </>
  );
}
