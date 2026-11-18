import type { Project } from "@/data/projects";
import TagList from "@/components/tag-list";

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <li className="card">
      <h3>
        <a className="inline-link" href={`/projects/${project.slug}`}>
          {project.title}
        </a>
      </h3>
      <p>{project.summary}</p>
      {project.techStack.length > 0 ? (
        <p className="brief-meta">
          <TagList items={project.techStack} />
        </p>
      ) : null}
      <p className="card-meta">
        <a className="card-cta" href={`/projects/${project.slug}`}>
          Details →
        </a>
      </p>
    </li>
  );
}
