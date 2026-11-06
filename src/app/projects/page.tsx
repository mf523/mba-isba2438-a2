import type { Metadata } from "next";
import ProjectCard from "@/components/project-card";
import { projects } from "@/data/projects";

export const metadata: Metadata = {
  title: "My Projects",
};

export default function Projects() {
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
