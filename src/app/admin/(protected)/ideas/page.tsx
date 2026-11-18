import type { Metadata } from "next";
import AdminPage from "../admin-page";
import IdeaBoard from "./idea-board";

export const metadata: Metadata = {
  title: "Ideas",
};

export default function IdeasPage() {
  return (
    <AdminPage
      title="Idea board"
      intro="Ideas are unpublished pieces of content — drafts that may become a blog post or a project. Write them by hand or draft one with the AI assistant from your notes, a brief, or an image."
    >
      <IdeaBoard />
    </AdminPage>
  );
}
