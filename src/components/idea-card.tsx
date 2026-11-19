"use client";

import { useState } from "react";
import type { Idea } from "@/data/ideas";
import {
  IDEA_ORIGIN_LABELS,
  IDEA_TARGET_TYPE_OPTIONS,
} from "@/data/ideas";
import DeleteButton from "@/components/delete-button";
import TagList from "@/components/tag-list";
import { formatDateTime } from "@/lib/format";

const targetLabel = (value: Idea["targetType"]) =>
  IDEA_TARGET_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;

export default function IdeaCard({
  idea,
  onEdit,
  onDelete,
  onGenerateArtwork,
  artworkBusy,
}: {
  idea: Idea;
  onEdit?: () => void;
  onDelete?: () => void;
  onGenerateArtwork?: () => void;
  artworkBusy?: boolean;
}) {
  const [bodyOpen, setBodyOpen] = useState(false);
  const used = idea.status === "used" && (idea.usedAs?.length ?? 0) > 0;
  const startMatch = idea.targetType === "blog-post"
    ? { href: `/admin/blogs?from-idea=${idea.id}`, label: "Start blog post" }
    : { href: `/admin/projects?from-idea=${idea.id}`, label: "Start project" };
  const startOther = idea.targetType === "blog-post"
    ? { href: `/admin/projects?from-idea=${idea.id}`, label: "Start project" }
    : { href: `/admin/blogs?from-idea=${idea.id}`, label: "Start blog post" };

  return (
    <li className="card brief-card">
      {idea.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- dynamic per-idea artwork served by the images API, not a site asset
        <img
          className="idea-artwork"
          src={idea.imageUrl}
          alt={`Generated artwork for the idea "${idea.title}"`}
        />
      ) : idea.imagePrompt ? (
        <div className="idea-artwork-pending">
          <p>Picture pending — the image service was unreachable.</p>
          <p className="idea-artwork-pending-prompt">
            Prompt saved: {idea.imagePrompt}
          </p>
        </div>
      ) : null}
      <div className="brief-card-head">
        <h3>{idea.title}</h3>
        <div className="brief-card-actions">
          {onEdit ? (
            <button className="secondary-button" type="button" onClick={onEdit}>
              Edit
            </button>
          ) : null}
          {onDelete ? (
            <DeleteButton
              confirmMessage={`Delete the idea "${idea.title}"? This cannot be undone.`}
              onDelete={onDelete}
            />
          ) : null}
        </div>
      </div>
      <p>{idea.summary}</p>
      {bodyOpen ? <p className="idea-card-body">{idea.body}</p> : null}
      {idea.body.trim().length > 0 ? (
        <p>
          <button
            className="link-button"
            type="button"
            aria-expanded={bodyOpen}
            onClick={() => setBodyOpen((open) => !open)}
          >
            {bodyOpen ? "Hide the idea" : "Read the idea"}
          </button>
        </p>
      ) : null}
      {used ? (
        <p className="brief-meta">
          <span className="tag">became</span>
          {(idea.usedAs ?? []).map((link) => (
            <a key={link.href} href={link.href}>
              {link.type === "blog-post" ? "Blog post" : "Project"}: {link.title}
            </a>
          ))}
        </p>
      ) : null}
      <p className="brief-meta">
        <TagList
          items={[
            IDEA_ORIGIN_LABELS[idea.origin],
            targetLabel(idea.targetType),
            ...(idea.status === "used" ? ["used"] : []),
          ]}
        />
        <span className="brief-audience">
          updated {formatDateTime(idea.updatedAt)}
        </span>
      </p>
      {onGenerateArtwork ? (
        <p className="brief-card-actions">
          <button
            className="secondary-button"
            type="button"
            disabled={artworkBusy}
            onClick={onGenerateArtwork}
          >
            {artworkBusy
              ? "Generating picture…"
              : idea.imageUrl
                ? "Regenerate picture"
                : "Generate picture"}
          </button>
        </p>
      ) : null}
      {onEdit ? (
        <p className="brief-card-actions">
          <a className="submit-button" href={startMatch.href}>
            {startMatch.label}
          </a>
          <a className="secondary-button" href={startOther.href}>
            {startOther.label}
          </a>
        </p>
      ) : null}
    </li>
  );
}
