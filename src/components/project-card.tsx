import Link from "next/link";
import type { Project } from "@/data/projects";

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <li className="card">
      <h3>
        <Link className="inline-link" href={`/projects/${project.slug}`}>
          {project.title}
        </Link>
      </h3>
      <p>{project.summary}</p>
    </li>
  );
}
