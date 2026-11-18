import type { Metadata } from "next";
import AdminPage from "../admin-page";
import ProjectsBoard from "./projects-board";

export const metadata: Metadata = {
  title: "Projects",
};

export default function ProjectsAdminPage() {
  return (
    <AdminPage
      title="Projects"
      intro="Manage the projects shown on the public /projects page. Every change goes through the projects API and the public pages update right away."
    >
      <ProjectsBoard />
    </AdminPage>
  );
}
