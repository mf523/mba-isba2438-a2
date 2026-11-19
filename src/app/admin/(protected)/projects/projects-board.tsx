"use client";

import { useEffect, useState } from "react";
import Drawer from "@/components/drawer";
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
  const [notice, setNotice] = useState<string | null>(null);

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

  useEffect(() => {
    const fromIdea = new URLSearchParams(window.location.search).get("from-idea");
    if (!fromIdea) return;
    const id = window.setTimeout(() => setEditor({ mode: "create" }), 0);
    return () => window.clearTimeout(id);
  }, []);

  function handleSaved(project: Project, mode: "create" | "edit") {
    setNotice(
      mode === "create"
        ? `Project added. View it at /projects/${project.slug}.`
        : `Project "${project.title}" updated.`,
    );
    if (state.status !== "ready") {
      load();
      setEditor({ mode: "closed" });
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
      {notice ? (
        <p className="form-feedback form-feedback-success" role="status" aria-live="polite">
          {notice}
        </p>
      ) : null}

      {editor.mode === "closed" ? (
        <p>
          <button
            className="submit-button"
            type="button"
            onClick={() => setEditor({ mode: "create" })}
          >
            New project
          </button>
        </p>
      ) : null}

      <Drawer
        open={editor.mode !== "closed"}
        onClose={() => setEditor({ mode: "closed" })}
        title={editor.mode === "edit" ? `Edit "${editor.project.title}"` : "New project"}
      >
        <ProjectForm
          editing={editor.mode === "edit" ? editor.project : null}
          onSaved={handleSaved}
          onCancelEdit={() => setEditor({ mode: "closed" })}
        />
      </Drawer>

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
              No projects yet. Add the first one with the New project button.
            </p>
          ) : (
            <ul className="brief-list">
              {state.projects.map((project) => (
                <ProjectItem
                  key={project.slug}
                  project={project}
                  onEdit={() => {
                    setEditor({ mode: "edit", project });
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
