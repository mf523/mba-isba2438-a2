import type { Idea } from "@/data/ideas";
import {
  IDEA_ORIGIN_LABELS,
  IDEA_TARGET_TYPE_OPTIONS,
} from "@/data/ideas";
import DeleteButton from "@/components/delete-button";

const targetLabel = (value: Idea["targetType"]) =>
  IDEA_TARGET_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;

export default function IdeaCard({
  idea,
  onEdit,
  onDelete,
}: {
  idea: Idea;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <li className="card brief-card">
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
      <p className="brief-meta">
        <span className="tag">{IDEA_ORIGIN_LABELS[idea.origin]}</span>
        <span className="tag">{targetLabel(idea.targetType)}</span>
        <span className="brief-audience">
          updated {new Date(idea.updatedAt).toLocaleString("en-US")}
        </span>
      </p>
      {onEdit ? (
        <p className="brief-card-actions">
          <a className="secondary-button" href={`/admin/blogs?from-idea=${idea.id}`}>
            Start blog post
          </a>
          <a className="secondary-button" href={`/admin/projects?from-idea=${idea.id}`}>
            Start project
          </a>
        </p>
      ) : null}
    </li>
  );
}
