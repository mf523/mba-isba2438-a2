import type { Metadata } from "next";
import { Suspense } from "react";
import AdminGate from "../admin-gate";
import IdeaBoard from "./idea-board";

export const metadata: Metadata = {
  title: "Ideas",
};

function IdeasContent() {
  return (
    <>
      <p>
        Ideas are unpublished pieces of content — drafts that may become a blog
        post or a project. Write them by hand or draft one with the AI
        assistant from your notes, a brief, or an image.
      </p>
      <IdeaBoard />
    </>
  );
}

export default function IdeasPage() {
  return (
    <>
      <h1>Idea board</h1>
      <Suspense fallback={null}>
        <AdminGate>
          <IdeasContent />
        </AdminGate>
      </Suspense>
    </>
  );
}
