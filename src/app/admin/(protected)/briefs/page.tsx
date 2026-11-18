import type { Metadata } from "next";
import AdminPage from "../admin-page";
import BriefsBoard from "./briefs-board";

export const metadata: Metadata = {
  title: "Briefs",
};

export default function BriefsPage() {
  return (
    <AdminPage
      title="Writing briefs"
      intro="Plan one piece of content at a time: what it is, who it is for, how it should sound and what it must cover. In a later stage the AI assistant can start from a brief."
    >
      <BriefsBoard />
    </AdminPage>
  );
}
