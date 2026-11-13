"use client";

import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="not-found">
      <h1>Something went wrong</h1>
      <p>
        An unexpected error occurred while rendering this page
        {error.digest ? ` (ref: ${error.digest})` : null}. Your data is safe.
      </p>
      <p>
        <button className="submit-button" type="button" onClick={reset}>
          Try again
        </button>
      </p>
      <p>
        <Link className="inline-link" href="/">
          Back to the home page
        </Link>
      </p>
    </div>
  );
}
