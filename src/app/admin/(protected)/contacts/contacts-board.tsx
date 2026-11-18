"use client";

import { useEffect, useState } from "react";
import DeleteButton from "@/components/delete-button";
import FormFeedback from "@/components/form-feedback";
import { formatDateTime } from "@/lib/format";
import type { ContactSubmission } from "@/lib/contact-submissions";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; submissions: ContactSubmission[] };

export default function ContactsBoard() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [notice, setNotice] = useState<{ status: "success" | "error"; message: string } | null>(null);

  function load() {
    fetch("/api/contacts", { headers: { "cache-control": "no-store" } })
      .then(async (response) => {
        const result = await response.json();
        if (response.ok && result.ok) {
          setState({ status: "ready", submissions: result.submissions });
        } else {
          setState({
            status: "error",
            message:
              response.status === 401
                ? "Sign in again to see contact requests."
                : "Could not load contact requests. Please try again.",
          });
        }
      })
      .catch(() => {
        setState({ status: "error", message: "Could not reach the server." });
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function handleStatusChange(submission: ContactSubmission) {
    const nextStatus = submission.status === "archived" ? "new" : "archived";
    setNotice(null);
    try {
      const response = await fetch(`/api/contacts/${submission.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json();
      if (response.ok && result.ok) {
        setNotice({
          status: "success",
          message:
            nextStatus === "archived"
              ? `Request from ${submission.name} archived.`
              : `Request from ${submission.name} moved back to new.`,
        });
        if (state.status === "ready") {
          setState({
            status: "ready",
            submissions: state.submissions.map((candidate) =>
              candidate.id === submission.id ? result.submission : candidate,
            ),
          });
        } else {
          load();
        }
      } else {
        setNotice({
          status: "error",
          message: result.message ?? "The update failed. Please try again.",
        });
      }
    } catch {
      setNotice({
        status: "error",
        message: "Could not reach the server. Please try again.",
      });
    }
  }

  async function handleDelete(submission: ContactSubmission) {
    setNotice(null);
    try {
      const response = await fetch(`/api/contacts/${submission.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setNotice({
          status: "success",
          message: `Request from ${submission.name} deleted.`,
        });
        if (state.status === "ready") {
          setState({
            status: "ready",
            submissions: state.submissions.filter(
              (candidate) => candidate.id !== submission.id,
            ),
          });
        } else {
          load();
        }
      } else {
        setNotice({
          status: "error",
          message: "The request could not be deleted. Please try again.",
        });
      }
    } catch {
      setNotice({
        status: "error",
        message: "Could not reach the server. Please try again.",
      });
    }
  }

  return (
    <>
      {notice ? (
        <FormFeedback status={notice.status} message={notice.message} />
      ) : null}

      {state.status === "loading" ? <p>Loading contact requests…</p> : null}
      {state.status === "error" ? (
        <p className="form-feedback form-feedback-error" role="alert">
          {state.message}{" "}
          <button className="secondary-button" type="button" onClick={load}>
            Retry
          </button>
        </p>
      ) : null}

      {state.status === "ready" ? (
        state.submissions.length === 0 ? (
          <p className="briefs-empty">
            No contact requests yet. Messages submitted through the public
            contact form appear here.
          </p>
        ) : (
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Message</th>
                <th scope="col">Submitted</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.submissions.map((submission) => (
                <tr key={submission.id}>
                  <td>{submission.name}</td>
                  <td>{submission.email}</td>
                  <td>{submission.message}</td>
                  <td>{formatDateTime(submission.submittedAt)}</td>
                  <td>
                    <span className="tag">
                      {submission.status === "archived" ? "Archived" : "New"}
                    </span>
                  </td>
                  <td className="brief-card-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => handleStatusChange(submission)}
                    >
                      {submission.status === "archived" ? "Unarchive" : "Archive"}
                    </button>
                    <DeleteButton
                      confirmMessage={`Delete the request from "${submission.name}"? This cannot be undone.`}
                      onDelete={() => handleDelete(submission)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )
      ) : null}
    </>
  );
}
