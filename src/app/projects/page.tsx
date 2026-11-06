import type { Metadata } from "next";
import Link from "next/link";
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
          <li key={project.slug} className="card">
            <h3>
              <Link className="inline-link" href={`/projects/${project.slug}`}>
                {project.title}
              </Link>
            </h3>
            <p>{project.summary}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
