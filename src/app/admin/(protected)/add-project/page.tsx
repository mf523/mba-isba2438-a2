import type { Metadata } from "next";
import { Suspense } from "react";
import AdminGate from "../admin-gate";
import AddProjectForm from "./add-project-form";

export const metadata: Metadata = {
  title: "Add Project",
};

function AddProjectContent() {
  return (
    <>
      <p>
        Add a new project to the portfolio. It appears on the home page and
        the projects page immediately, with its own project page.
      </p>
      <AddProjectForm />
    </>
  );
}

export default function AddProjectPage() {
  return (
    <>
      <h1>Add project</h1>
      <Suspense fallback={null}>
        <AdminGate>
          <AddProjectContent />
        </AdminGate>
      </Suspense>
    </>
  );
}
