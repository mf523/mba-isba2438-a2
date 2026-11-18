import type { Metadata } from "next";
import { Suspense } from "react";
import AdminGate from "../admin-gate";
import BriefsBoard from "./briefs-board";

export const metadata: Metadata = {
  title: "Briefs",
};

function BriefsContent() {
  return (
    <>
      <p>
        Plan one piece of content at a time: what it is, who it is for, how it
        should sound and what it must cover. In a later stage the AI assistant
        can start from a brief.
      </p>
      <BriefsBoard />
    </>
  );
}

export default function BriefsPage() {
  return (
    <>
      <h1>Writing briefs</h1>
      <Suspense fallback={null}>
        <AdminGate>
          <BriefsContent />
        </AdminGate>
      </Suspense>
    </>
  );
}
