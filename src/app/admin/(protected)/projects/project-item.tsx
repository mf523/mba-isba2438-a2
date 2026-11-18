"use client";

import DeleteButton from "@/components/delete-button";
import type { Project } from "@/data/projects";

export default function ProjectItem({
  project,
  onEdit,
  onDeleted,
}: {
  project: Project;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  async function handleDelete() {
    try {
      const response = await fetch(`/api/projects/${project.slug}`, {
        method: "DELETE",
      });
      if (response.ok) {
        onDeleted();
      } else {
        window.alert(
          "The project could not be deleted. Please try again after reloading.",
        );
      }
    } catch {
      window.alert("Could not reach the server. Please try again.");
    }
  }

  return (
    <li className="card brief-card">
      <div className="brief-card-head">
        <h3>{project.title}</h3>
        <div className="brief-card-actions">
          <button className="secondary-button" type="button" onClick={onEdit}>
            Edit
          </button>
          <DeleteButton
            confirmMessage={`Delete the project "${project.title}"? This cannot be undone.`}
            onDelete={handleDelete}
          />
        </div>
      </div>
      <p>{project.summary}</p>
      {project.techStack.length > 0 ? (
        <p className="brief-meta">
          {project.techStack.map((tech) => (
            <span className="tag" key={tech}>
              {tech}
            </span>
          ))}
        </p>
      ) : null}
      <p className="brief-audience">
        {project.repoUrl ? <a href={project.repoUrl}>repository</a> : null}
        {project.repoUrl && project.liveUrl ? " · " : null}
        {project.liveUrl ? <a href={project.liveUrl}>live</a> : null}
      </p>
    </li>
  );
}
