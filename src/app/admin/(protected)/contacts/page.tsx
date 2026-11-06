import type { Metadata } from "next";
import { Suspense } from "react";
import {
  getContactSubmissions,
  type ContactSubmission,
} from "@/lib/contact-submissions";
import AdminGate from "../admin-gate";

export const metadata: Metadata = {
  title: "Contact Requests",
};

function SubmittedAt({ submission }: { submission: ContactSubmission }) {
  return <>{new Date(submission.submittedAt).toLocaleString("en-US")}</>;
}

async function ContactRequestsContent() {
  let submissions: ContactSubmission[];
  let storeError: string | null = null;
  try {
    submissions = await getContactSubmissions();
  } catch {
    submissions = [];
    storeError = "The submissions store could not be read.";
  }

  const sorted = [...submissions].sort((a, b) =>
    b.submittedAt.localeCompare(a.submittedAt),
  );

  return (
    <>
      <p>Messages submitted through the contact form, newest first.</p>
      {storeError ? (
        <p className="form-feedback form-feedback-error" role="alert">
          {storeError}
        </p>
      ) : null}
      {sorted.length === 0 ? (
        <p>No contact requests yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Message</th>
              <th scope="col">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((submission) => (
              <tr key={submission.id}>
                <td>{submission.name}</td>
                <td>{submission.email}</td>
                <td>{submission.message}</td>
                <td>
                  <SubmittedAt submission={submission} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export default function ContactRequestsPage() {
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
