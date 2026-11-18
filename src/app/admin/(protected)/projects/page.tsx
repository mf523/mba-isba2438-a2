import type { Metadata } from "next";
import { Suspense } from "react";
import AdminGate from "../admin-gate";
import ProjectsBoard from "./projects-board";

export const metadata: Metadata = {
  title: "Projects",
};

function ProjectsContent() {
  return (
    <>
      <p>
        Manage the projects shown on the public /projects page. Every change
        goes through the projects API and the public pages update right away.
      </p>
      <ProjectsBoard />
    </>
  );
}

export default function ProjectsAdminPage() {
  return (
    <>
      <h1>Projects</h1>
      <Suspense fallback={null}>
        <AdminGate>
          <ProjectsContent />
        </AdminGate>
      </Suspense>
    </>
  );
}
