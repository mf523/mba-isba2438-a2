"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  IDEA_TARGET_TYPE_OPTIONS,
  validateIdeaInput,
  type Idea,
  type IdeaOrigin,
  type IdeaTargetType,
} from "@/data/ideas";
import {
  getBriefsSnapshot,
  getServerBriefsSnapshot,
  subscribeToBriefs,
} from "@/lib/briefs-store";
import type { BriefsSnapshot } from "@/lib/briefs-store";
import type { Choice } from "@/lib/ai";
import FormFeedback from "@/components/form-feedback";

export interface IdeaFormProps {
  editing: Idea | null;
  onSaved: (idea: Idea, mode: "create" | "edit") => void;
  onCancelEdit: () => void;
}

function summaryFromParagraph(paragraph: string): string {
  const firstSentence = paragraph.split(/(?<=[.!?])\s/)[0] ?? paragraph;
  const trimmed = firstSentence.trim();
  return trimmed.length > 200 ? `${trimmed.slice(0, 197)}...` : trimmed;
}

export default function IdeaForm({ editing, onSaved, onCancelEdit }: IdeaFormProps) {
  const briefsSnapshot: BriefsSnapshot = useSyncExternalStore(
    subscribeToBriefs,
    getBriefsSnapshot,
    getServerBriefsSnapshot,
  );
  const briefs = briefsSnapshot.briefs;

  const [title, setTitle] = useState(editing?.title ?? "");
  const [summary, setSummary] = useState(editing?.summary ?? "");
  const [body, setBody] = useState(editing?.body ?? "");
  const [targetType, setTargetType] = useState<IdeaTargetType>(
    editing?.targetType ?? "blog-post",
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  const [seed, setSeed] = useState("");
  const [briefId, setBriefId] = useState("");
  const [origin, setOrigin] = useState<IdeaOrigin>(editing?.origin ?? "hand");
  const [choices, setChoices] = useState<Choice[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [choicesPending, setChoicesPending] = useState(false);
  const [choicesError, setChoicesError] = useState<string | null>(null);
  const [assistantConfigured, setAssistantConfigured] = useState<boolean | null>(null);
  const [artworkPending, setArtworkPending] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const choicesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (choices.length > 0 && !choicesPending) {
      choicesRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [choices, choicesPending]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/assistant", { headers: { "cache-control": "no-store" } })
      .then((response) => (response.ok ? response.json() : { configured: false }))
      .then((data) => {
        if (!cancelled) setAssistantConfigured(Boolean(data.configured));
      })
      .catch(() => {
        if (!cancelled) setAssistantConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function applyBrief(id: string) {
    setBriefId(id);
    if (!id) return;
    const brief = briefs.find((candidate) => candidate.id === id);
    if (!brief) return;
    setTargetType(brief.contentType === "project" ? "project" : "blog-post");
    if (seed.trim().length === 0) {
      setSeed(
        `Audience: ${brief.audience}. Tone: ${brief.tone}. About: ${brief.title}. Points: ${brief.keyPoints}`,
      );
    }
  }

  async function handleShowChoices() {
    setChoicesError(null);
    setChoicesPending(true);
    try {
      const brief = briefs.find((candidate) => candidate.id === briefId);
      const response = await fetch("/api/assistant/choices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seed,
          targetType,
          brief: brief
            ? {
                title: brief.title,
                audience: brief.audience,
                tone: brief.tone,
                keyPoints: brief.keyPoints,
              }
            : null,
        }),
      });
      const result = await response.json();
      if (response.ok && result.ok && Array.isArray(result.choices)) {
        setChoices(result.choices);
        setSelectedChoice(null);
      } else {
        setChoicesError(
          result.message ?? "The assistant could not help right now. Please try again.",
        );
      }
    } catch {
      setChoicesError("Could not reach the server. Please try again.");
    } finally {
      setChoicesPending(false);
    }
  }

  function handleSelectChoice(index: number) {
    const choice = choices[index];
    if (!choice) {
      return;
    }
    setSelectedChoice(index);
    setSummary(summaryFromParagraph(choice.paragraph));
    setBody(choice.paragraph);
    setOrigin("assistant");
    titleRef.current?.focus();
  }

  async function handleGenerateArtwork(ideaId: string) {
    setArtworkPending(true);
    setStatus("idle");
    try {
      const response = await fetch("/api/assistant/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId }),
      });
      const result = await response.json();
      if (response.ok && result.ok && result.idea) {
        onSaved(result.idea, editing ? "edit" : "create");
        setStatus("success");
        setMessage("Picture generated and attached to the idea.");
      } else if (result.artworkPending && result.idea) {
        onSaved(result.idea, editing ? "edit" : "create");
        setStatus("success");
        setMessage(result.message);
      } else {
        setStatus("error");
        setMessage(
          result.message ?? "The picture could not be generated. Please try again.",
        );
      }
    } catch {
      setStatus("error");
      setMessage("Could not reach the server. Please try again.");
    } finally {
      setArtworkPending(false);
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateIdeaInput({ title, summary, body, targetType });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors as Record<string, string>);
      return;
    }
    setFieldErrors({});
    setIsPending(true);
    try {
      const response = await fetch(
        editing ? `/api/ideas/${editing.id}` : "/api/ideas",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, summary, body, targetType, origin }),
        },
      );
      const result = await response.json();
      if (response.ok && result.ok && result.idea) {
        const saved: Idea = result.idea;
        onSaved(saved, editing ? "edit" : "create");
        if (editing) {
          setStatus("success");
          setMessage("Idea updated.");
        } else {
          setTitle("");
          setSummary("");
          setBody("");
          setSeed("");
          setBriefId("");
          setChoices([]);
          setSelectedChoice(null);
          setOrigin("hand");
          setStatus("success");
          setMessage("Idea saved to the server.");
        }
        if (selectedChoice !== null && choices[selectedChoice]) {
          await handleGenerateArtwork(saved.id);
        }
      } else if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
        setStatus("error");
        setMessage("Please fix the highlighted fields and try again.");
      } else {
        setStatus("error");
        setMessage(result.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Could not reach the server. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  const field = (name: string, id: string) => ({
    "aria-invalid": fieldErrors[name] ? true : undefined,
    "aria-describedby": fieldErrors[name] ? `${id}-error` : undefined,
  });
  const error = (name: string, id: string) =>
    fieldErrors[name] ? (
      <p className="field-error" id={`${id}-error`}>
        {fieldErrors[name]}
      </p>
    ) : null;

  const selectedNarrative = selectedChoice !== null ? choices[selectedChoice] : null;

  return (
    <form onSubmit={handleSave} noValidate>
      {status !== "idle" ? (
        <FormFeedback status={status} message={message} />
      ) : null}

      <section className="briefs-privacy" aria-label="AI choice assistant">
        <h3 style={{ marginTop: 0 }}>
          {editing ? "Push it further — the problem is choice." : "The problem is choice."}
        </h3>
        <p>
          Type a seed — a few words or sentences. The assistant returns three
          distinct directions; you pick one and it becomes the idea.
        </p>
        {assistantConfigured === false ? (
          <p className="form-feedback form-feedback-error" role="status">
            The AI assistant is not configured on this server (set
            ANTHROPIC_API_KEY, or AI_PROVIDER=ollama). Everything else on this
            page keeps working.
          </p>
        ) : null}
        <div className="field-group">
          <span className="field-label" id="idea-brief-label">
            Start from a brief (optional)
          </span>
          <div
            className="pill-group pill-group-wrap"
            role="group"
            aria-labelledby="idea-brief-label"
          >
            <button
              type="button"
              aria-pressed={briefId === ""}
              onClick={() => applyBrief("")}
            >
              Write my own
            </button>
            {briefs.map((brief) => (
              <button
                key={brief.id}
                type="button"
                aria-pressed={briefId === brief.id}
                onClick={() => applyBrief(brief.id)}
              >
                {brief.title}
              </button>
            ))}
          </div>
        </div>
        <div className="field-group">
          <label htmlFor="idea-seed">Your seed</label>
          <textarea
            id="idea-seed"
            rows={3}
            placeholder="e.g. database migrations explained through bad relationships"
            value={seed}
            onChange={(event) => setSeed(event.target.value)}
          />
        </div>
        <button
          className="secondary-button"
          type="button"
          disabled={choicesPending}
          onClick={handleShowChoices}
        >
          {choicesPending ? "Consulting the oracle…" : "Show me the choices"}
        </button>
        {choices.length > 0 ? (
          <button
            className="secondary-button"
            type="button"
            disabled={choicesPending}
            style={{ marginLeft: 8 }}
            onClick={handleShowChoices}
          >
            {choicesPending ? "Shuffling…" : "Shuffle again"}
          </button>
        ) : null}
        {choicesError ? (
          <p className="form-feedback form-feedback-error" role="alert">
            {choicesError}
          </p>
        ) : null}
        {choices.length > 0 ? (
          <div className="choices-grid" role="listbox" aria-label="Narrative choices" ref={choicesRef}>
            {choices.map((choice, index) => (
              <button
                type="button"
                key={`${choice.angle}-${index}`}
                className={`choice-card${selectedChoice === index ? " choice-card-selected" : ""}`}
                role="option"
                aria-selected={selectedChoice === index}
                onClick={() => handleSelectChoice(index)}
              >
                <span className="tag">{choice.angle}</span>
                <p>{choice.paragraph}</p>
                <span className="choice-card-cta">
                  {selectedChoice === index ? "Chosen — edit below" : "Choose this one"}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        {selectedNarrative ? (
          <p className="briefs-count">
            Choice {(selectedChoice ?? 0) + 1} of {choices.length} fills the summary and
            body below — edit anything before saving.
          </p>
        ) : null}
      </section>

      {editing && editing.body.trim().length > 0 ? (
        <p>
          <button
            className="secondary-button"
            type="button"
            disabled={artworkPending}
            onClick={() => handleGenerateArtwork(editing.id)}
          >
            {artworkPending ? "Generating picture…" : editing.imageUrl ? "Regenerate picture" : "Generate picture"}
          </button>
        </p>
      ) : null}

      <div className="field-group">
        <span className="field-label" id="idea-type-label">
          This idea becomes *
        </span>
        <div
          className="pill-group"
          role="group"
          aria-labelledby="idea-type-label"
          aria-describedby={fieldErrors.targetType ? "idea-type-error" : undefined}
        >
          {IDEA_TARGET_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={targetType === option.value}
              onClick={() => setTargetType(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {error("targetType", "idea-type")}
      </div>
      <div className="field-group">
        <label htmlFor="idea-title">Title *</label>
        <input
          id="idea-title"
          ref={titleRef}
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          {...field("title", "idea-title")}
        />
        {error("title", "idea-title")}
      </div>
      <div className="field-group">
        <label htmlFor="idea-summary">One-line summary *</label>
        <input
          id="idea-summary"
          type="text"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          {...field("summary", "idea-summary")}
        />
        {error("summary", "idea-summary")}
      </div>
      <div className="field-group">
        <label htmlFor="idea-body">Body *</label>
        <textarea
          id="idea-body"
          rows={8}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          {...field("body", "idea-body")}
        />
        {error("body", "idea-body")}
      </div>
      <button className="submit-button" type="submit" disabled={isPending}>
        {isPending ? "Saving…" : editing ? "Save changes" : "Save idea"}
      </button>
      {editing ? (
        <button className="secondary-button" type="button" onClick={onCancelEdit}>
          Cancel edit
        </button>
      ) : null}
    </form>
  );
}
