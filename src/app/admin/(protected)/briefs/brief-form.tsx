"use client";

import { useState } from "react";
import {
  CONTENT_TYPE_OPTIONS,
  TONE_OPTIONS,
  validateBriefInput,
  type Brief,
  type BriefContentType,
  type BriefFieldErrors,
  type BriefTone,
} from "@/lib/briefs";

export interface BriefFormProps {
  initial?: Brief | null;
  onSave: (input: {
    title: string;
    contentType: BriefContentType;
    audience: string;
    tone: BriefTone;
    keyPoints: string;
  }) => void;
  onCancel: () => void;
}

export default function BriefForm({ initial, onSave, onCancel }: BriefFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [contentType, setContentType] = useState<BriefContentType>(
    initial?.contentType ?? "blog-post",
  );
  const [audience, setAudience] = useState(initial?.audience ?? "");
  const [tone, setTone] = useState<BriefTone>(initial?.tone ?? "friendly");
  const [keyPoints, setKeyPoints] = useState(initial?.keyPoints ?? "");
  const [fieldErrors, setFieldErrors] = useState<BriefFieldErrors>({});

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateBriefInput({
      title,
      contentType,
      audience,
      tone,
      keyPoints,
    });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    onSave({
      title: title.trim(),
      contentType,
      audience: audience.trim(),
      tone,
      keyPoints: keyPoints.trim(),
    });
  }

  const field = (name: keyof BriefFieldErrors, id: string) => ({
    "aria-invalid": fieldErrors[name] ? true : undefined,
    "aria-describedby": fieldErrors[name] ? `${id}-error` : undefined,
  });
  const error = (name: keyof BriefFieldErrors, id: string) =>
    fieldErrors[name] ? (
      <p className="field-error" id={`${id}-error`}>
        {fieldErrors[name]}
      </p>
    ) : null;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="field-group">
        <label htmlFor="brief-title">Working title *</label>
        <input
          id="brief-title"
          name="title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          {...field("title", "brief-title")}
        />
        {error("title", "brief-title")}
      </div>
      <div className="field-group">
        <label htmlFor="brief-type">Type *</label>
        <select
          id="brief-type"
          name="contentType"
          value={contentType}
          onChange={(event) => setContentType(event.target.value as BriefContentType)}
          {...field("contentType", "brief-type")}
        >
          {CONTENT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error("contentType", "brief-type")}
      </div>
      <div className="field-group">
        <label htmlFor="brief-audience">Audience *</label>
        <input
          id="brief-audience"
          name="audience"
          type="text"
          placeholder="who is this for?"
          value={audience}
          onChange={(event) => setAudience(event.target.value)}
          {...field("audience", "brief-audience")}
        />
        {error("audience", "brief-audience")}
      </div>
      <div className="field-group">
        <label htmlFor="brief-tone">Tone *</label>
        <select
          id="brief-tone"
          name="tone"
          value={tone}
          onChange={(event) => setTone(event.target.value as BriefTone)}
          {...field("tone", "brief-tone")}
        >
          {TONE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error("tone", "brief-tone")}
      </div>
      <div className="field-group">
        <label htmlFor="brief-points">Key points *</label>
        <textarea
          id="brief-points"
          name="keyPoints"
          rows={5}
          placeholder="one point per line — what must this piece cover?"
          value={keyPoints}
          onChange={(event) => setKeyPoints(event.target.value)}
          {...field("keyPoints", "brief-points")}
        />
        {error("keyPoints", "brief-points")}
      </div>
      <div className="brief-form-actions">
        <button className="submit-button" type="submit">
          {initial ? "Save changes" : "Save brief"}
        </button>
        <button className="secondary-button" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
