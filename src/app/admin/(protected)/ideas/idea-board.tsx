"use client";

import { useEffect, useState } from "react";
import IdeaCard from "@/components/idea-card";
import IdeaForm from "./idea-form";
import {
  IDEA_TARGET_TYPE_OPTIONS,
  type Idea,
  type IdeaTargetType,
} from "@/data/ideas";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; ideas: Idea[] };

type Filter = "all" | IdeaTargetType;

type Editor =
  | { mode: "closed" }
  | { mode: "create"; fromBrief?: string }
  | { mode: "edit"; idea: Idea };

export default function IdeaBoard() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [filter, setFilter] = useState<Filter>("all");
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor>({ mode: "closed" });
  const [artworkBusyIds, setArtworkBusyIds] = useState<string[]>([]);

  useEffect(() => {
    const fromBrief = new URLSearchParams(window.location.search).get("from-brief");
    if (!fromBrief) return;
    const id = window.setTimeout(() => setEditor({ mode: "create", fromBrief }), 0);
    return () => window.clearTimeout(id);
  }, []);

  async function handleGenerateArtwork(idea: Idea) {
    setArtworkBusyIds((current) => [...current, idea.id]);
    setSavedNotice(null);
    setBoardError(null);
    try {
      const response = await fetch("/api/assistant/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId: idea.id }),
      });
      const result = await response.json();
      if (response.ok && result.ok && result.idea) {
        const updated: Idea = result.idea;
        setSavedNotice(`Picture generated for "${idea.title}".`);
        if (state.status === "ready") {
          setState({
            status: "ready",
            ideas: state.ideas.map((candidate) =>
              candidate.id === updated.id ? updated : candidate,
            ),
          });
        } else {
          load();
        }
        if (editor.mode === "edit" && editor.idea.id === updated.id) {
          setEditor({ mode: "edit", idea: updated });
        }
      } else if (result.artworkPending && result.idea) {
        const updated: Idea = result.idea;
        setSavedNotice(
          `The picture service is unreachable — the image prompt was saved for "${idea.title}". Try again later.`,
        );
        if (state.status === "ready") {
          setState({
            status: "ready",
            ideas: state.ideas.map((candidate) =>
              candidate.id === updated.id ? updated : candidate,
            ),
          });
        } else {
          load();
        }
        if (editor.mode === "edit" && editor.idea.id === updated.id) {
          setEditor({ mode: "edit", idea: updated });
        }
      } else {
        setSavedNotice(null);
        setBoardError(
          result.message ?? "The picture could not be generated. Please try again.",
        );
      }
    } catch {
      setSavedNotice(null);
      setBoardError("Could not reach the server. Please try again.");
    } finally {
      setArtworkBusyIds((current) => current.filter((id) => id !== idea.id));
    }
  }

  function load() {
    fetch("/api/ideas", { headers: { "cache-control": "no-store" } })
      .then(async (response) => {
        const result = await response.json();
        if (response.ok && result.ok) {
          setState({ status: "ready", ideas: result.ideas });
        } else {
          setState({
            status: "error",
            message:
              response.status === 401
                ? "Sign in again to see your ideas."
                : "Could not load ideas. Please try again.",
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

  function handleSaved(idea: Idea, mode: "create" | "edit") {
    setSavedNotice(
      mode === "create"
        ? `Idea "${idea.title}" saved.`
        : `Idea "${idea.title}" updated.`,
    );
    if (state.status !== "ready") {
      load();
      setEditor({ mode: "closed" });
      return;
    }
    setState({
      status: "ready",
      ideas:
        mode === "create"
          ? [...state.ideas, idea]
          : state.ideas.map((candidate) =>
              candidate.id === idea.id ? idea : candidate,
            ),
    });
    setEditor({ mode: "closed" });
  }

  async function handleDelete(idea: Idea) {
    setBoardError(null);
    try {
      const response = await fetch(`/api/ideas/${idea.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setSavedNotice(null);
        setBoardError("The idea could not be deleted. Please try again after reloading.");
        return;
      }
      setSavedNotice(`Idea "${idea.title}" deleted.`);
      if (state.status === "ready") {
        setState({
          status: "ready",
          ideas: state.ideas.filter((candidate) => candidate.id !== idea.id),
        });
      } else {
        load();
      }
      if (editor.mode === "edit" && editor.idea.id === idea.id) {
        setEditor({ mode: "closed" });
      }
    } catch {
      setSavedNotice(null);
      setBoardError("Could not reach the server. Please try again.");
    }
  }

  const sorted =
    state.status === "ready"
      ? [...state.ideas].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        )
      : [];
  const visible =
    filter === "all"
      ? sorted
      : sorted.filter((idea) => idea.targetType === filter);

  return (
    <>
      {savedNotice ? (
        <p className="form-feedback form-feedback-success" role="status" aria-live="polite">
          {savedNotice}
        </p>
      ) : null}
      {boardError ? (
        <p className="form-feedback form-feedback-error" role="alert">
          {boardError}
        </p>
      ) : null}

      <section aria-label="Saved ideas">
        <h2>Saved ideas</h2>
        {state.status === "loading" ? <p>Loading ideas…</p> : null}
        {state.status === "error" ? (
          <p className="form-feedback form-feedback-error" role="alert">
            {state.message}{" "}
            <button className="secondary-button" type="button" onClick={load}>
              Retry
            </button>
          </p>
        ) : null}
        {state.status === "ready" ? (
          state.ideas.length === 0 ? (
            <>
              <p className="briefs-empty">
                No ideas yet. Add one by hand, type a seed and pick one of three
                choices, or start from a brief.
              </p>
              <p>
                <button
                  className="submit-button"
                  type="button"
                  onClick={() => setEditor({ mode: "create" })}
                >
                  New idea
                </button>
              </p>
            </>
          ) : (
            <>
              <div className="field-group">
                <span className="field-label" id="idea-filter-label">
                  Filter by type
                </span>
                <div
                  className="pill-group"
                  role="group"
                  aria-labelledby="idea-filter-label"
                >
                  <button
                    type="button"
                    aria-pressed={filter === "all"}
                    onClick={() => setFilter("all")}
                  >
                    All
                  </button>
                  {IDEA_TARGET_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={filter === option.value}
                      onClick={() => setFilter(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              {visible.length === 0 ? (
                <p>No ideas of this type yet.</p>
              ) : (
                <ul className="brief-list">
                  {visible.map((idea) => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      onEdit={() => {
                        setEditor({ mode: "edit", idea });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      onDelete={() => handleDelete(idea)}
                      onGenerateArtwork={() => handleGenerateArtwork(idea)}
                      artworkBusy={artworkBusyIds.includes(idea.id)}
                    />
                  ))}
                </ul>
              )}
            </>
          )
        ) : null}
      </section>

      {editor.mode !== "closed" ? (
        <section aria-label={editor.mode === "edit" ? "Edit idea" : "Add an idea"}>
          <h2>
            {editor.mode === "edit" ? `Edit "${editor.idea.title}"` : "Add an idea"}
          </h2>
          <IdeaForm
            key={editor.mode === "edit" ? `edit-${editor.idea.id}` : "create"}
            editing={editor.mode === "edit" ? editor.idea : null}
            initialBriefId={editor.mode === "create" ? editor.fromBrief : undefined}
            onSaved={handleSaved}
            onCancelEdit={() => setEditor({ mode: "closed" })}
          />
          {editor.mode === "create" ? (
            <p>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setEditor({ mode: "closed" })}
              >
                Close
              </button>
            </p>
          ) : null}
        </section>
      ) : (
        state.status === "ready" && state.ideas.length > 0 ? (
          <p>
            <button
              className="submit-button"
              type="button"
              onClick={() => {
                setEditor({ mode: "create" });
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              New idea
            </button>
          </p>
        ) : null
      )}
    </>
  );
}
