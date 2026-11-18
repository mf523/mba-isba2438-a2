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
import FormFeedback from "@/components/form-feedback";

export interface IdeaFormProps {
  editing: Idea | null;
  onSaved: (idea: Idea, mode: "create" | "edit") => void;
  onCancelEdit: () => void;
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

  const [notes, setNotes] = useState("");
  const [briefId, setBriefId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [origin, setOrigin] = useState<IdeaOrigin>(editing?.origin ?? "hand");
  const [assistantPending, setAssistantPending] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [assistantConfigured, setAssistantConfigured] = useState<boolean | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

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
    if (notes.trim().length === 0) {
      setNotes(
        `Audience: ${brief.audience}\nTone: ${brief.tone}\n\n${brief.keyPoints}`,
      );
    }
  }

  function handleImageChange(file: File | null) {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImageFile(file);
    setImagePreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  async function handleSuggest() {
    setAssistantError(null);
    setAssistantPending(true);
    try {
      const form = new FormData();
      form.set("targetType", targetType);
      form.set("notes", notes);
      const brief = briefs.find((candidate) => candidate.id === briefId);
      if (brief) {
        form.set("briefTitle", brief.title);
        form.set("briefAudience", brief.audience);
        form.set("briefTone", brief.tone);
        form.set("briefKeyPoints", brief.keyPoints);
      }
      if (imageFile) {
        form.set("image", imageFile);
      }
      const response = await fetch("/api/assistant", { method: "POST", body: form });
      const result = await response.json();
      if (response.ok && result.ok) {
        setTitle(result.suggestion.title);
        setSummary(result.suggestion.summary);
        setBody(result.suggestion.body);
        setOrigin(imageFile ? "assistant-image" : "assistant");
        titleRef.current?.focus();
      } else {
        setAssistantError(
          result.message ?? "The assistant could not help right now. Please try again.",
        );
      }
    } catch {
      setAssistantError("Could not reach the server. Please try again.");
    } finally {
      setAssistantPending(false);
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
        onSaved(result.idea, editing ? "edit" : "create");
        if (editing) {
          setStatus("success");
          setMessage("Idea updated.");
        } else {
          setTitle("");
          setSummary("");
          setBody("");
          setNotes("");
          setBriefId("");
          handleImageChange(null);
          setOrigin("hand");
          setStatus("success");
          setMessage("Idea saved to the server.");
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

  return (
    <form onSubmit={handleSave} noValidate>
      {status !== "idle" ? (
        <FormFeedback status={status} message={message} />
      ) : null}

      {editing ? null : (
      <section className="briefs-privacy" aria-label="AI assistant">
        <h3 style={{ marginTop: 0 }}>Draft with the assistant</h3>
        {assistantConfigured === false ? (
          <p className="form-feedback form-feedback-error" role="status">
            The AI assistant is not configured on this server (set
            ANTHROPIC_API_KEY). Everything else on this page keeps working.
          </p>
        ) : null}
        <div className="field-group">
          <label htmlFor="idea-brief">Start from a brief</label>
          <select
            id="idea-brief"
            value={briefId}
            onChange={(event) => applyBrief(event.target.value)}
          >
            <option value="">No brief — freeform notes</option>
            {briefs.map((brief) => (
              <option key={brief.id} value={brief.id}>
                {brief.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="idea-notes">Notes for the assistant</label>
          <textarea
            id="idea-notes"
            rows={4}
            placeholder="describe what you want to write — required before asking the assistant"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
        <div className="field-group">
          <label htmlFor="idea-image">Attach an image (optional)</label>
          <input
            id="idea-image"
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={(event) => handleImageChange(event.target.files?.[0] ?? null)}
          />
          {imagePreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not a site asset
            <img
              src={imagePreviewUrl}
              alt="Preview of the attached image"
              style={{ maxWidth: 240, maxHeight: 160, marginTop: 8, display: "block" }}
            />
          ) : null}
        </div>
        <button
          className="secondary-button"
          type="button"
          disabled={assistantPending}
          onClick={handleSuggest}
        >
          {assistantPending ? "Asking the assistant…" : "Suggest with assistant"}
        </button>
        {assistantError ? (
          <p className="form-feedback form-feedback-error" role="alert">
            {assistantError}
          </p>
        ) : null}
      </section>
      )}

      <div className="field-group">
        <label htmlFor="idea-type">This idea becomes *</label>
        <select
          id="idea-type"
          value={targetType}
          onChange={(event) => setTargetType(event.target.value as IdeaTargetType)}
          {...field("targetType", "idea-type")}
        >
          {IDEA_TARGET_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
