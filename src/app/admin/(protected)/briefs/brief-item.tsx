"use client";

import {
  CONTENT_TYPE_OPTIONS,
  TONE_OPTIONS,
  type Brief,
} from "@/lib/briefs";

const typeLabel = (value: Brief["contentType"]) =>
  CONTENT_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
const toneLabel = (value: Brief["tone"]) =>
  TONE_OPTIONS.find((option) => option.value === value)?.label ?? value;

export default function BriefItem({
  brief,
  onEdit,
  onDelete,
}: {
  brief: Brief;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const points = brief.keyPoints
    .split("\n")
    .map((point) => point.trim())
    .filter(Boolean);

  return (
    <li className="card brief-card">
      <div className="brief-card-head">
        <h3>{brief.title}</h3>
        <div className="brief-card-actions">
          <button className="secondary-button" type="button" onClick={onEdit}>
            Edit
          </button>
          <button className="danger-button" type="button" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
      <p className="brief-meta">
        <span className="tag">{typeLabel(brief.contentType)}</span>
        <span className="tag">{toneLabel(brief.tone)}</span>
        <span className="brief-audience">for {brief.audience}</span>
      </p>
      {points.length > 0 ? (
        <ul className="brief-points">
          {points.map((point) => (
            <li key={point.slice(0, 40)}>{point}</li>
          ))}
        </ul>
      ) : null}
      <p className="card-meta">Updated {new Date(brief.updatedAt).toLocaleString("en-US")}</p>
    </li>
  );
}
