import type { Project } from "@/data/projects";

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <li className="card">
      <h3>
        <a className="inline-link" href={`/projects/${project.slug}`}>
          {project.title}
        </a>
      </h3>
      <p>{project.summary}</p>
    </li>
  );
}
