export interface Blog {
  slug: string;
  title: string;
  summary: string;
  content: string;
  publishedAt: string;
}

export const DEFAULT_BLOGS: Blog[] = [
  {
    slug: "building-this-portfolio",
    title: "Building This Portfolio",
    summary: "How this portfolio is put together with Next.js App Router.",
    content:
      "This portfolio is a Next.js App Router project with server-rendered pages, a dynamic project route, and a contact form backed by a server action. Data lives in small JSON stores that are read through cached functions and written atomically.",
    publishedAt: "2026-11-01T09:00:00.000Z",
  },
  {
    slug: "server-forms-vs-api-routes",
    title: "Server Forms vs API Routes",
    summary: "Two ways to submit a contact form, and when each fits.",
    content:
      "A server action keeps the form and endpoint in one place and works without extra client code. A JSON API route is more explicit: the client builds the request, and the response drives the feedback. This site implements both so the trade-offs are easy to compare.",
    publishedAt: "2026-11-05T09:00:00.000Z",
  },
];
