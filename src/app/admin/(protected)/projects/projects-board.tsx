"use client";

import { useEffect, useState } from "react";
import ProjectForm from "./project-form";
import ProjectItem from "./project-item";
import type { Project } from "@/data/projects";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; projects: Project[] };

type Editor =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; project: Project };

export default function ProjectsBoard() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [editor, setEditor] = useState<Editor>({ mode: "closed" });

  function load() {
    fetch("/api/projects", { headers: { "cache-control": "no-store" } })
      .then(async (response) => {
        const result = await response.json();
        if (response.ok && result.ok) {
          setState({ status: "ready", projects: result.projects });
        } else {
          setState({
            status: "error",
            message: "Could not load projects. Please try again.",
          });
        }
      })
      .catch(() => {
        setState({ status: "error", message: "Could not reach the server." });
      });
  }

  useEffect(() => {
    load();
  }, []);

  function handleSaved(project: Project, mode: "create" | "edit") {
    if (state.status !== "ready") {
      load();
      return;
    }
    setState({
      status: "ready",
      projects:
        mode === "create"
          ? [...state.projects, project]
          : state.projects.map((candidate) =>
              candidate.slug === project.slug ? project : candidate,
            ),
    });
    setEditor({ mode: "closed" });
  }

  function handleDeleted(slug: string) {
    if (state.status !== "ready") {
      load();
      return;
    }
    setState({
      status: "ready",
      projects: state.projects.filter(
        (candidate) => candidate.slug !== slug,
      ),
    });
    if (editor.mode === "edit" && editor.project.slug === slug) {
      setEditor({ mode: "closed" });
    }
  }

  return (
    <>
      <section aria-label={editor.mode === "edit" ? "Edit project" : "Add a project"}>
        <h2>{editor.mode === "edit" ? `Edit "${editor.project.title}"` : "Add a project"}</h2>
        <ProjectForm
          editing={editor.mode === "edit" ? editor.project : null}
          onSaved={handleSaved}
          onCancelEdit={() => setEditor({ mode: "closed" })}
        />
      </section>

      <section aria-label="All projects">
        <h2>All projects</h2>
        {state.status === "loading" ? <p>Loading projects…</p> : null}
        {state.status === "error" ? (
          <p className="form-feedback form-feedback-error" role="alert">
            {state.message}{" "}
            <button className="secondary-button" type="button" onClick={load}>
              Retry
            </button>
          </p>
        ) : null}
        {state.status === "ready" ? (
          state.projects.length === 0 ? (
            <p className="briefs-empty">
              No projects yet. Add the first one with the form above.
            </p>
          ) : (
            <ul className="brief-list">
              {state.projects.map((project) => (
                <ProjectItem
                  key={project.slug}
                  project={project}
                  onEdit={() => {
                    setEditor({ mode: "edit", project });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onDeleted={() => handleDeleted(project.slug)}
                />
              ))}
            </ul>
          )
        ) : null}
      </section>
    </>
  );
}
