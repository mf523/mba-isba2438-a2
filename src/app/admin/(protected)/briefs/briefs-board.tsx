"use client";

import { useState, useSyncExternalStore } from "react";
import Drawer from "@/components/drawer";
import FormFeedback from "@/components/form-feedback";
import BriefForm from "./brief-form";
import BriefItem from "./brief-item";
import {
  sortBriefsNewestFirst,
  type Brief,
  type BriefContentType,
  type BriefTone,
} from "@/lib/briefs";
import {
  getBriefsSnapshot,
  getServerBriefsSnapshot,
  subscribeToBriefs,
  writeBriefs,
  type BriefsSnapshot,
} from "@/lib/briefs-store";

type EditorState =
  | { mode: "closed" }
  | { mode: "new" }
  | { mode: "edit"; brief: Brief };

export default function BriefsBoard() {
  const { briefs, unreadable } = useSyncExternalStore<BriefsSnapshot>(
    subscribeToBriefs,
    getBriefsSnapshot,
    getServerBriefsSnapshot,
  );
  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });
  const [notice, setNotice] = useState("");
  const [writeError, setWriteError] = useState<string | null>(null);

  function persist(next: Brief[]) {
    const result = writeBriefs(next);
    setWriteError(result.ok ? null : (result.error ?? null));
  }

  function handleSave(input: {
    title: string;
    contentType: BriefContentType;
    audience: string;
    tone: BriefTone;
    keyPoints: string;
  }) {
    const now = new Date().toISOString();
    if (editor.mode === "edit") {
      persist(
        briefs.map((brief) =>
          brief.id === editor.brief.id ? { ...brief, ...input, updatedAt: now } : brief,
        ),
      );
      setNotice("Brief updated.");
    } else {
      const brief: Brief = {
        id: crypto.randomUUID(),
        ...input,
        createdAt: now,
        updatedAt: now,
      };
      persist([brief, ...briefs]);
      setNotice("Brief saved in this browser.");
    }
    setEditor({ mode: "closed" });
  }

  function handleDelete(brief: Brief) {
    if (!window.confirm(`Delete the brief "${brief.title}"? This cannot be undone.`)) {
      return;
    }
    persist(briefs.filter((candidate) => candidate.id !== brief.id));
    setNotice("Brief deleted.");
    if (editor.mode === "edit" && editor.brief.id === brief.id) {
      setEditor({ mode: "closed" });
    }
  }

  function handleClearAll() {
    if (!window.confirm("Delete every brief saved in this browser? This cannot be undone.")) {
      return;
    }
    persist([]);
    setNotice("All briefs cleared.");
    setEditor({ mode: "closed" });
  }

  const sorted = sortBriefsNewestFirst(briefs);

  return (
    <>
      <p className="briefs-privacy" role="note">
        Briefs are private working notes saved only in this browser
        (localStorage). Nothing on this page is sent to the server. Brief text
        only leaves this browser later, if you choose to send it to the AI
        assistant.
      </p>

      {notice ? (
        <FormFeedback status="success" message={notice} />
      ) : null}

      {unreadable ? (
        <p className="form-feedback form-feedback-error" role="alert">
          Saved briefs in this browser couldn&apos;t be read — the stored data may be
          malformed. Starting from an empty list; saving now replaces it.
        </p>
      ) : null}

      {writeError ? (
        <p className="form-feedback form-feedback-error" role="alert">
          {writeError}
        </p>
      ) : null}

      {editor.mode === "closed" ? (
        <p>
          <button
            className="submit-button"
            type="button"
            onClick={() => setEditor({ mode: "new" })}
          >
            New brief
          </button>
        </p>
      ) : null}

      <Drawer
        open={editor.mode !== "closed"}
        onClose={() => setEditor({ mode: "closed" })}
        title={editor.mode === "edit" ? "Edit brief" : "New brief"}
      >
        <BriefForm
          initial={editor.mode === "edit" ? editor.brief : null}
          onSave={handleSave}
          onCancel={() => setEditor({ mode: "closed" })}
        />
      </Drawer>

      <section aria-label="Saved briefs">
        <h2>Saved briefs</h2>
        {sorted.length === 0 ? (
          <p className="briefs-empty">
            No briefs yet. Start with “New brief” — notes you save here stay in
            this browser.
          </p>
        ) : (
          <>
            <p className="briefs-count">
              {sorted.length} {sorted.length === 1 ? "brief" : "briefs"}, newest first.
            </p>
            <ul className="brief-list">
              {sorted.map((brief) => (
                <BriefItem
                  key={brief.id}
                  brief={brief}
                  onEdit={() => {
                    setEditor({ mode: "edit", brief });
                  }}
                  onDelete={() => handleDelete(brief)}
                />
              ))}
            </ul>
            <p>
              <button className="danger-button" type="button" onClick={handleClearAll}>
                Clear all briefs
              </button>
            </p>
          </>
        )}
      </section>
    </>
  );
}
