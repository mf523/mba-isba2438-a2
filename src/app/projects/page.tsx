import type { Metadata } from "next";
import ProjectCard from "@/components/project-card";
import { getProjects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "My Projects",
};

export default async function Projects() {
  const projects = await getProjects();

  return (
    <>
      <h1>My Projects</h1>
      <p>A collection of projects I have built. Click one for details.</p>
      <ul className="card-list">
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </ul>
    </>
  );
}
