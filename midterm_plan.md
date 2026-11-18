# Midterm plan — portfolio → content creation site

Working agreement: one stage per cycle — build, then review (explain + test, no edits), then revisions. `npm run lint`, `npm test`, and `npm run build` must stay green after every change. Source of truth for requirements: `midterm_requirements.md` (due Nov 20, 2026, 11:59 p.m. Pacific; ≤10-minute video walkthrough).

## Baseline stocktake (2026-11-13, verified)

- All routes healthy: `/`, `/about-me`, `/projects`, `/projects/[slug]`, `/blogs`, `/blogs/[slug]`, `/contact-me`, `/contact-me-server-form`, `/admin/login` + 5 protected admin screens, styled 404, `error.tsx` boundary.
- APIs: `GET/POST /api/blogs` (POST admin-only: 401/201/400/409), `GET /api/blogs/[slug]` (200/404), `POST /api/contacts` (201/400/500) + `/api/contact` alias (identical behaviour).
- No API for projects (server action), no GET on contacts, no PUT/DELETE anywhere.
- Stores (`data/` via `createJsonStore`): `projects.json`, `blogs.json` (defaults when absent), `about.json`, `site-config.json`, `contact-submissions.json`, `.session-secret` (gitignored).
- Components: only `project-card.tsx` and `form-feedback.tsx`; header, blog list items, form fields, admin tables, submit buttons are inline.
- Known behaviour: unauth admin pages return 200 and stream a redirect to `/admin/login` with no data (PPR semantics, verified no leaks). Client router cache can serve stale pages ~5 min after mutations; mitigated by plain `<a>` nav (already in place).

## Stage 1 — Writing briefs (browser localStorage)

Purpose: a brief is a short planning note for one piece of content — what it is, who it's for, how it should sound, what it must cover. A brief produces nothing by itself; in stage 2 the AI assistant gets a "Start from a brief" option that fills its request (path: brief → assistant suggestion → saved idea → blog post or project). The assistant hook-up is NOT built now; this stage is save, list, edit, delete only.

Privacy: briefs are private working notes — saved only in the browser's localStorage, nothing on the page talks to the server, and the page says so. Brief text leaves the browser only later, when explicitly sent to the assistant.

| Item | Detail |
|---|---|
| Exists | nothing |
| Path | `/admin/briefs`, added to the admin navigation |
| Fields | working title (text); type — `Blog post` or `Project` (select); audience (text); tone — `Friendly`, `Professional` or `Technical` (select); key points (textarea, free-form list) |
| Behaviour | save button writes the brief; list sorted newest first; each brief editable and deletable; clear-all control; empty state when nothing saved; briefs survive a refresh |
| Architecture | storage logic in a pure-function module: `STORAGE_KEY` constant, `readBriefsStorage(raw)` → `{ briefs, usable, dropped }` (tolerates missing/malformed/wrong-shaped data), `serializeBriefs(briefs)` → string; unit-testable without a browser. A thin client module (`briefs-store.ts`) wraps localStorage as a React external store (`useSyncExternalStore`) — hydration-safe (server snapshot = empty, client snapshot = parsed) and lint-clean with no effects. Writes are guarded: if storage is full/disabled the board keeps working from memory and says the brief won't survive a refresh; if stored data is unreadable the board shows a warning and starts from an empty list. Briefs are text-only; images attach later, at the assistant step. `brief-form.tsx` and `brief-item.tsx` receive data and callbacks via props |
| Files | `src/lib/briefs.ts` (types, key, parse/serialize, validation), `src/app/admin/briefs/page.tsx` + `briefs-board.tsx` + `brief-form.tsx` + `brief-item.tsx`, `src/lib/briefs.test.ts` |
| Tests | validation matrix; round-trip serialize → parse; corrupt/empty/garbage input tolerated; newest-first ordering |
| Decisions | brief ids via `randomUUID`; `updatedAt` refreshed on edit; enum fields validated against the fixed option lists |
| Decision | lives under `/admin/briefs` with the other authoring screens |

## Stage 2 — Idea board with AI assistant

Purpose: give the assistant notes, optionally a saved brief (via "Start from a brief") and an image (screenshot/photo); it suggests a title, summary, and body; save keepers as ideas. Satisfies the midterm backend-JSON + API feature.

| Item | Detail |
|---|---|
| Exists | store factory, admin auth in route handlers, client-fetch form pattern, `FormFeedback` |
| Files | `src/data/ideas.ts`, `src/lib/ideas.ts` (+ tests), `src/app/api/ideas/route.ts` (GET, POST), `src/app/api/ai/suggest/route.ts` (admin-only multipart: notes + optional briefId + optional image), `src/lib/ai.ts` (raw `fetch` to the Anthropic Messages API, prompt building, 60 s `AbortController` timeout, response validation), `src/app/admin/ideas/page.tsx` + `idea-studio.tsx`, `src/components/idea-card.tsx` (receives idea via props — required by rubric) |
| Dependencies | none (raw fetch, no SDK) |
| Secrets | `AI_API_KEY`, optional `AI_MODEL`, in `.env.local`; documented in `.env.example`; server-side only |
| Cost | one call per suggestion, ~2–4K tokens round-trip with an image → fractions of a cent to a few cents each on a Sonnet-class model; admin-gated so the public cannot spend quota |
| Failure modes | missing/invalid key → 503 friendly message; upstream 429/529 → 502 retry hint; timeout → 504; malformed AI output → validate then 502; image >4 MB → 413; policy refusal → model's message passed through |
| Decisions | suggestions are returned, not saved — saving is an explicit "Save as idea" step; images are sent to the AI but not persisted (keeps the JSON store small) |

## Stage 3 — Full CRUD for everything the API serves

Migrate the Add-project server action to `POST /api/projects` (one code path). Studio screens become client-fetch CRUD views like `/blogs`. "Start a blog post / project from an idea" = client-side prefill via query param (no extra endpoint).

| Method | Path | Who may call | Status codes |
|---|---|---|---|
| GET | `/api/blogs` | public | 200 |
| POST | `/api/blogs` | admin | 201, 400, 401, 409 |
| GET | `/api/blogs/[slug]` | public | 200, 404 |
| PUT | `/api/blogs/[slug]` | admin | 200, 400, 401, 404 |
| DELETE | `/api/blogs/[slug]` | admin | 200, 401, 404 |
| GET | `/api/projects` | public | 200 |
| POST | `/api/projects` | admin | 201, 400, 401, 409 |
| GET | `/api/projects/[slug]` | public | 200, 404 |
| PUT | `/api/projects/[slug]` | admin | 200, 400, 401, 404 |
| DELETE | `/api/projects/[slug]` | admin | 200, 401, 404 |
| GET | `/api/contacts` | admin | 200, 401 |
| POST | `/api/contacts` | public | 201, 400, 500 |
| PUT | `/api/contacts/[id]` | admin | 200, 400, 401, 404 |
| DELETE | `/api/contacts/[id]` | admin | 200, 401, 404 |
| GET | `/api/ideas` | admin | 200, 401 |
| POST | `/api/ideas` | admin | 201, 400, 401 |
| PUT | `/api/ideas/[id]` | admin | 200, 400, 401, 404 |
| DELETE | `/api/ideas/[id]` | admin | 200, 401, 404 |
| POST | `/api/ai/suggest` | admin | 200, 400, 401, 413, 502, 503, 504 |

Notes:
- `/api/contact` stays as a behaviour-identical alias.
- Contact submissions get a `status` field (`new`/`archived`) so "update" is meaningful instead of editing message history.
- Slugs are immutable on PUT (rename = delete + recreate) to avoid orphaning prerendered paths.

Caching constraints: public `/` and `/projects*` pages use `"use cache"` + `cacheTag`; API mutations call `revalidateTag`, which refreshes the server cache but not the client router cache (~5 min staleness, mitigated by `<a>` nav already in place). Studio screens are client-fetch and always fresh. Alternative (convert public project pages to client-fetch, losing prerendering) — recommended against.

## Stage 4 — Componentize

| Component | Replaces |
|---|---|
| `src/components/site-header.tsx` | inline header in `src/app/layout.tsx` |
| `src/components/blog-card.tsx` | inline blog list item in `blogs-list.tsx` |
| `src/components/field.tsx` + `textarea-field.tsx` | label/input/error trio repeated in 6 forms |
| `src/components/submit-button.tsx` | pending-label submit buttons in 5 forms |
| `src/components/idea-card.tsx` | created in stage 2 at first use |
| `src/components/project-card.tsx`, `form-feedback.tsx` | already exist |

Approach: build `Field`, `BlogCard`, and `IdeaCard` during stages 2–3 at their first use; stage 4 sweeps the rest. No behaviour changes.

## Sequencing

Stages run 1 → 2 → 3 → 4, each a full build → review → revisions cycle, all checks green before moving on. Everything must be demonstrable in a ≤10-minute video: LocalStorage persistence across refresh, API invocations with server logs, HTTP 201 on creation, and the custom-feature component receiving data via props.
