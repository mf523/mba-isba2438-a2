import type { Metadata } from "next";
import { Suspense } from "react";
import AdminGate from "../admin-gate";
import ContactsBoard from "./contacts-board";

export const metadata: Metadata = {
  title: "Contact Requests",
};

function ContactRequestsContent() {
  return (
    <>
      <p>
        Messages submitted through the public contact form, newest first, loaded
        through the contacts API. Archive a request to file it away, or delete
        it.
      </p>
      <ContactsBoard />
    </>
  );
}

export default function ContactsAdminPage() {
  return (
    <>
      <h1>Contact requests</h1>
      <Suspense fallback={null}>
        <AdminGate>
          <ContactRequestsContent />
        </AdminGate>
      </Suspense>
    </>
  );
}
