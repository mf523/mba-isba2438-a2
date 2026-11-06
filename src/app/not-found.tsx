import Link from "next/link";

export default function NotFound() {
  return (
    <div className="not-found">
      <h1>Page not found</h1>
      <p>
        The page you are looking for does not exist. It may have been moved,
        renamed, or never existed.
      </p>
      <p>
        <Link className="inline-link" href="/">
          Back to the home page
        </Link>
      </p>
    </div>
  );
}
