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

## Stage 2 — Idea board (2a) + AI assistant (2b)

Status: BUILT (Nov 17). Lint clean, 80/80 tests, production build green. E2E verified with a headless browser: seeds render, hand idea persists via the API (201), filter works, full GET/PUT/DELETE + 400/404 matrix passes, and the `[api] METHOD path → status` lines appear in the server terminal. The assistant is verified live end-to-end against Ollama (`deepseek-v4.1-flash:cloud` returned a real, length-valid suggestion); the refusal/malformed paths are covered by stubbed unit tests.

Provider note (Nov 17): the assistant supports two providers selected by `AI_PROVIDER` in `.env` — `anthropic` (default, `ANTHROPIC_API_KEY` required) and `ollama` (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`, optional `OLLAMA_API_KEY` for cloud models). Ollama cloud backends do not enforce the `format` JSON schema, so the prompt itself demands a JSON-only reply and the reply parser tolerates markdown fences. `.env` is now live config (moved from `.env.example`, gitignored).

An idea is unpublished content: a title, a one-line summary and a body, meant to become either a blog post or a project. Every idea records its origin: written by hand, suggested by the assistant, or suggested from an image.

### Stage 2a — Idea board (no AI yet)

| Item | Detail |
|---|---|
| Exists | store factory, admin auth in route handlers, client-fetch list pattern (`/blogs`), `FormFeedback` |
| Data | `src/data/ideas.ts`: `Idea` type ({ id, title, summary, body, targetType: `blog-post` \| `project`, origin: `hand` \| `assistant` \| `assistant-image`, createdAt, updatedAt }) + 2 placeholder seed entries, built the same way as blogs. Length limits mirror blog/project fields so an idea can become either: title ≤80, summary ≤200, body ≤5000 |
| Store | `src/lib/ideas.ts`: `createJsonStore` wiring, `validateIdeaInput` (per-field errors), `listIdeas`/`getIdeaById`/`addIdea`/`updateIdea`/`deleteIdea`; ids are UUIDs (ideas are unpublished; slugs come when they become posts/projects) |
| Shared API module | `src/lib/api.ts`: request logging (one line per request: method, path, status, to the server terminal), the admin-session check (401 response), and JSON body parsing (400 response) — shared by all idea handlers; existing handlers move onto it in stage 3 |
| API | `/api/ideas` (GET list, POST create) + `/api/ideas/[id]` (GET, PUT, DELETE). Every call requires the admin session — reads included (ideas are unpublished work). Conventions: 201 create, 400 with per-field errors, 401 without session, 404 unknown id, `ok` in every response body |
| Page | `/admin/ideas` in the admin navigation: client component that fetches the API like the blogs list, with loading, error and empty states, a filter by target type, and a form to add an idea by hand (origin `hand`) |
| Out of scope | on-screen edit/delete (stage 3, with the other content screens — but the API has PUT/DELETE now); the AI assistant (stage 2b) |
| Tests | store round-trip, duplicate-id rejection, validation matrix, seed defaults |

### Stage 2b — AI assistant

Purpose: describe what to write, optionally start from a saved brief and optionally attach an image (screenshot/photo); the assistant suggests a title, a one-line summary and a body. The suggestion lands in the idea form for editing, then "Save as idea" persists it (origin `assistant` or `assistant-image`). The assistant never saves or publishes anything by itself.

| Item | Detail |
|---|---|
| Exists | ideas store + API from stage 2a; briefs storage module from stage 1 |
| Files | `src/app/api/assistant/route.ts` (POST), `src/lib/ai.ts` (model call, prompt building, response validation), idea-form extensions: "Start from a brief" picker (reads briefs via the briefs storage module and fills the request with the brief's fields — the brief itself never leaves localStorage), image attach with preview, pending state while waiting, per-failure messages |
| SDK + model | `@anthropic-ai/sdk` (official TypeScript SDK), model `claude-opus-5-5`; image and text sent together in one message; single request/response, no streaming. BEFORE writing the call, read the current API documentation for image input, structured output and refusal handling (including the fallback option) — several parameters changed recently and older examples no longer work |
| Structured output | title, summary, body requested as structured output (not free text to parse), validated against the idea length limits (title ≤80, summary ≤200, body ≤5000) |
| Secrets | `ANTHROPIC_API_KEY` from the environment, read only on the server, documented in `.env.example`. Without a key the endpoint answers a clear "assistant is not configured" error and the page says so, while everything else keeps working |
| Images | PNG, JPEG, WebP, GIF up to the size the API allows; anything else rejected with a clear message BEFORE the model call. The image is used for that one request only: never stored, never logged |
| Failure UX | pending state while waiting; model refusal, API failure and timeout each get their own clear message; suggestion never auto-saves |
| Tests | request validation (missing notes, bad type, bad image type/size, brief fields) and model-reply handling (valid structured reply, refusal, malformed reply) with the model call replaced by a stub — no key, no network |
| Cost | one call per suggestion on `claude-opus-5-5`; admin-gated because every call costs money |

## Stage 3 — Full CRUD for everything the API serves

Split into 3.1 (API and data layer) and 3.2 (studio screens). "Start a blog post / project from an idea" = client-side prefill via query param (no extra endpoint), built in 3.2.

### Stage 3.1 — API and data layer (no screen changes)

Bring projects, blog posts and contact submissions up to the same level as ideas: each listable, individually readable, creatable, updatable and deletable through the API, persisted through the existing JSON stores in `src/lib/`.

| Item | Detail |
|---|---|
| New: projects API | `/api/projects` (GET public list, POST admin) + `/api/projects/[slug]` (GET public, PUT admin, DELETE admin). Duplicate slug → 409 as blogs do |
| Blogs API gaps | `/api/blogs/[slug]` gains PUT + DELETE (admin). List + individual GET stay public and unchanged |
| Contacts API gaps | `/api/contacts` gains GET (admin — submissions hold visitors' emails) + `/api/contacts/[id]` (GET, PUT, DELETE, admin). POST stays public — visitors must be able to submit without a session |
| Shared helpers | ALL four resources' handlers (existing ones included) move onto the `src/lib/api.ts` helpers from the ideas API: `requireAdmin` (401), `parseJsonBody` (400), `logApiCall` (the one-line `[api] METHOD path → status` server log) — identical logging and response shape everywhere |
| Project validation | Currently inline in the add-project server action — moves to `src/lib/projects.ts` as `validateProjectInput` (same limits: title ≤80, slug lowercase/dashes, summary ≤200, description ≤2000, optional http(s) URLs, tech stack list). Both the action and `POST`/`PUT /api/projects` call the same function |
| Project store writes | `src/lib/projects.ts` gains `updateProject` + `deleteProject`; `addProject`/`updateProject`/`deleteProject` each call `revalidateTag("projects", { expire: 0 })` internally, so every entry point (server action + route handlers) invalidates the cached public pages identically |
| Cache invalidation (verified against bundled docs `node_modules/next/dist/docs`) | `revalidateTag` IS callable from Route Handlers in this Next version — but the single-argument form is deprecated; the two-argument `revalidateTag(tag, profile)` is required. `updateTag` is Server-Action-only and cannot be used from route handlers. `{ expire: 0 }` means stale content is never served (next request blocks on fresh data) — kept because the existing add-project action uses it and a public portfolio should never show stale/deleted content. MUST be confirmed against a production build + running server (dev does not cache the same way) |
| Immutable identity | PUT edits content only — never `id`/`slug` (existing URLs keep working). A PUT body carrying a different slug → 400 field error on `slug`; body without a slug is fine. Rename = delete + recreate |
| Contact updates | Submissions get a `status` field (`new`/`archived`); PUT accepts `status` only — visitor message content is never edited |
| Tests | Extend `blogs.test.ts` + `contact-submissions.test.ts` and add `projects.test.ts`: the new update/delete store functions (round-trip, unknown id/slug, duplicate-slug 409 path, slug immutability), the moved project validation matrix, contact status transitions |

Status: BUILT (Nov 17). 100/100 unit tests, lint clean, production build green. Live e2e against the production server: full API matrix (projects/blogs/contacts create-read-update-delete with 409/400/401/404 paths), cache invalidation confirmed in both directions on the public `/projects` page after POST and DELETE, and unauth contact reads return 401. Note: `revalidateTag` throws its "static generation store missing" invariant outside a request scope (e.g. unit tests), so the store-level call is guarded — invalidation itself is verified live.

### Stage 3.2 — Studio screens

Studio screens for all four content types. Every screen is a client component that talks to the API with `fetch` — no server actions, no direct store reads — so the Network tab shows the whole story. The public pages do not change.

| Screen | Today | 3.2 adds |
|---|---|---|
| `/admin/projects` (new) | `/admin/add-project`: page + form + `addProjectAction` server action | Full management screen: list (client-fetch via `/api/projects`), create, edit (per-item form), delete. The old `/admin/add-project` URL redirects to the new one; the action file is deleted |
| `/admin/blogs` | create form only (already fetches `/api/blogs`) | List, edit (title/summary/content per item) and delete via `/api/blogs` + `/api/blogs/[slug]` |
| `/admin/contacts` | server component reading the store directly | Client-fetch list via `/api/contacts` (admin-gated), archive/unarchive (PUT `status`) and delete; creating stays on the public contact form |
| `/admin/ideas` | list + create (hand/assistant) | Edit and delete per idea via `/api/ideas/[id]` |

Shared behaviour on every screen: the list updates in place after each change (state refresh, no manual reload); success/failure via the existing `FormFeedback`; 400 `fieldErrors` render beside their fields; delete asks for confirmation first (same confirm pattern as the briefs board's clear-all); loading, empty and failed states each say what's happening (ideas-board pattern).

Shared components in `src/components/` (small pieces only — no generic CRUD framework; each screen stays readable top to bottom):
- `field.tsx` — label + input + inline error, from the repeated trio in 6 forms
- `textarea-field.tsx` — same for textareas
- `delete-button.tsx` — delete with built-in confirmation step

Idea → content (the board is where content starts): each idea card gets "Start blog post" and "Start project" buttons linking to the create screens with `?from-idea=<id>`. The target form fetches `/api/ideas/[id]` on mount and prefills: title → title, summary → summary, body → content (blog) or description (project) — ready to edit and save through the normal create flow (201 via `/api/blogs` or `/api/projects`). The idea stays on the board until deleted by hand.

Admin navigation (studio order): Briefs · Ideas · Blog posts · Projects · Contact requests · About page · Site config · View site — "Add project" disappears; settings pages keep their names. The assistant stays inside the Ideas screen (no separate nav item).

Verification: production-build e2e per screen (list/create/edit/delete + field errors + confirm + stale-cache check on public `/projects` after a write), extending the stage 2a browser script.

Status: BUILT (Nov 17). Live e2e on the production build: all four screens list/create/edit/delete with in-place list updates, FormFeedback, field-level API errors, confirm-gated deletes, loading/empty/error states; idea → blog/project prefill works on both create forms; studio nav order confirmed; `/admin/add-project` 307-redirects to `/admin/projects`.

| Method | Path | Who may call | Status codes | Landing |
|---|---|---|---|---|
| GET | `/api/blogs` | public | 200 | exists |
| POST | `/api/blogs` | admin | 201, 400, 401, 409 | exists |
| GET | `/api/blogs/[slug]` | public | 200, 404 | exists |
| PUT | `/api/blogs/[slug]` | admin | 200, 400, 401, 404 | stage 3.1 |
| DELETE | `/api/blogs/[slug]` | admin | 200, 401, 404 | stage 3.1 |
| GET | `/api/projects` | public | 200 | stage 3.1 |
| POST | `/api/projects` | admin | 201, 400, 401, 409 | stage 3.1 |
| GET | `/api/projects/[slug]` | public | 200, 404 | stage 3.1 |
| PUT | `/api/projects/[slug]` | admin | 200, 400, 401, 404 | stage 3.1 |
| DELETE | `/api/projects/[slug]` | admin | 200, 401, 404 | stage 3.1 |
| GET | `/api/contacts` | admin | 200, 401 | stage 3.1 |
| POST | `/api/contacts` | public | 201, 400, 500 | exists |
| GET | `/api/contacts/[id]` | admin | 200, 401, 404 | stage 3.1 |
| PUT | `/api/contacts/[id]` | admin | 200, 400, 401, 404 | stage 3.1 |
| DELETE | `/api/contacts/[id]` | admin | 200, 401, 404 | stage 3.1 |
| GET | `/api/ideas` | admin | 200, 401 | stage 2a |
| POST | `/api/ideas` | admin | 201, 400, 401 | stage 2a |
| GET | `/api/ideas/[id]` | admin | 200, 401, 404 | stage 2a |
| PUT | `/api/ideas/[id]` | admin | 200, 400, 401, 404 | stage 2a (API), stage 3.2 (screen) |
| DELETE | `/api/ideas/[id]` | admin | 200, 401, 404 | stage 2a (API), stage 3.2 (screen) |
| POST | `/api/assistant` | admin | 200, 400, 401, 413, 502, 503 (not configured), 504 | stage 2b |

Notes:
- `/api/contact` stays as a behaviour-identical alias (re-exports the contacts POST).
- Contact submissions get a `status` field (`new`/`archived`) so "update" is meaningful instead of editing message history; PUT accepts `status` only.
- Slugs/ids are immutable on PUT — a differing slug in the body is a 400 field error (rename = delete + recreate) so existing URLs and prerendered paths stay valid.

Caching constraints (confirmed against the bundled Next docs): public `/` and `/projects*` pages use `"use cache"` + `cacheTag`; project writes must call the two-argument `revalidateTag("projects", { expire: 0 })` (single-arg is deprecated; `updateTag` is Server-Action-only and cannot be used from route handlers). Revalidation refreshes the server cache but not the client router cache (~5 min staleness, mitigated by `<a>` nav already in place). Studio screens are client-fetch and always fresh. Alternative (convert public project pages to client-fetch, losing prerendering) — recommended against. Confirm invalidation against a production build before closing 3.1 (dev does not cache the same way).

## Stage 4 — Componentize (BUILT)

Refactoring pass only: repeated UI becomes reusable components. Nothing behaves or looks different afterwards; components live in `src/components/` with typed props; no server component becomes a client component. Deliverable includes a component inventory (what each is, its props, where it's used).

Confirmed repetition (checked in code):
- The public blogs list (`src/app/blogs/blogs-list.tsx`) renders blog items inline — the only inline content rendering left (ideas already use `IdeaCard`; projects use `ProjectCard`).
- Date formatting: `toLocaleString("en-US")` in 4 files (blog-item, contacts-board, brief-item, idea-card) + `toLocaleDateString` long form in the public blogs list.
- Tag markup: `<span className="tag">` repeated in 7 files; real multi-tag lists exist in project-item (tech stack), idea-card (origin + target) and brief-item (type + tone).
- Header, nav (inline `navItems`) and footer are written directly in `src/app/layout.tsx`.
- Both public contact forms (`contact-me/contact-api-form.tsx`, `contact-me-server-form/contact-form.tsx`) build their own field markup instead of the shared `Field`/`TextareaField`.
- All 7 admin pages repeat: `<h1>`, intro paragraph, `Suspense` + `AdminGate` wrapper (metadata export stays per page).

| Component | Change |
|---|---|
| `src/components/blog-card.tsx` (new) | extracted from the public blogs list: one blog via props (linked title, summary, long-form date). The list keeps fetching |
| `src/components/site-header.tsx` + `site-footer.tsx` (new, server) | extracted from the root layout; tagline/footer text passed as props from the layout's existing `getSiteConfig()` call; nav items stay a constant inside the header |
| `src/components/admin-page.tsx` (new, server) | wraps `h1` + optional intro + `Suspense`/`AdminGate` for all 7 admin pages; each page keeps its own `metadata` export and passes `title`/`intro` |
| `src/components/tag-list.tsx` (new) | renders `items: string[]` as tag spans; used where there is a real list (tech stack, idea and brief tag pairs). Single-tag meta lines stay plain spans — wrapping them would be indirection, not de-duplication |
| `src/lib/format.ts` (new, pure) | `formatDateTime(iso)` + `formatDate(iso)` replacing the 5 inline formatting sites |
| `field.tsx` / `textarea-field.tsx` | both public contact forms switch onto them (same markup/classes already) |
| `idea-card.tsx` | stays exactly as it is: purely presentational, typed props for the idea and optional `onEdit`/`onDelete` actions, no fetching, no state — this is the rubric's parent-to-child props demo |

Deliberately skipped (indirection, not duplication — reported per the requirement):
- The four admin boards repeat a load/error/retry scaffolding, and project/blog delete-fetches live in their item components. Unifying them would be the generic CRUD framework the requirement explicitly excludes; each board stays readable top to bottom.
- `idea-form`'s controlled `field()`/`error()` helpers are not switched to the uncontrolled `Field` component — the assistant flow needs controlled values, and converting it risks behavior change for zero visible gain.
- `briefs-board`'s raw success `<p>` becomes a `FormFeedback` call (identical markup) — noted, not a new component.

Verification: `npm run check` + full unit suite + the stage 3.2 e2e script rerun unchanged (same PASS list proves nothing behaves differently), plus a spot-check that public and admin pages render identical markup (compare pre/post HTML of `/` and `/admin/projects`).

## Feature — "The Problem is Choice" (BUILT, choice_plan.md)

Choice-driven ideation on the ideas board, replacing the single-draft assistant: seed → three distinct AI narrative choices (Ollama via the configured model) → pick → fills the editable idea form → generated artwork (keyless Pollinations; prompt-only fallback) persisted on the idea (`imagePrompt`/`imageUrl`, file in `data/images/`, admin-gated `GET /api/images/[ideaId]`). New routes `POST /api/assistant/choices` + `POST /api/assistant/image`; `requestSuggestion` + `POST /api/assistant` retired; brief handoff pre-fills the seed. E2e suite extended to 58 checks including the live oracle + artwork flow; walkthrough script rewritten (`demo_script.md`, target 9:30).

## Sequencing

Stages run 1 → 2a → 2b → 3.1 → 3.2 → 4 → 5, each a full build → review → revisions cycle, all checks green before moving on. Everything must be demonstrable in a ≤10-minute video: LocalStorage persistence across refresh, API invocations with server logs (one line per request via the shared module), HTTP 201 on creation, and the custom-feature component receiving data via props.

## Stage 5 — Design polish (BUILT)

Outcome of the design review (contrast audit + page-by-page layout pass). Changes are intentional visual improvements.

- Tokens in `globals.css`: full color/radius token set, `--measure` for prose, Geist Mono for meta dates; **dark mode** via `prefers-color-scheme` token overrides.
- AA fixes (verified by computed contrast audit, light and dark): primary button white-on-`--accent-dark` 6.19:1 (was 2.38), header tagline solid white 6.19:1 (was 3.32), card titles use `--accent` (4.68 light / 5.03 dark), mobile nav tap targets 45px (was 23px), zero horizontal overflow at 390px.
- Type scale: h1 34 / h2 24 / card h3 20 (explicit) / meta 12 mono; `:where(.card) p` fixes the `.card p` specificity bug that blocked `.card-meta` styling.
- Home: hero with tagline + "View projects"/"Get in touch" CTAs; featured grid capped at 3 + "All projects →".
- Projects list + home: 2-column grid ≥720px; public cards now show tech pills + "Details →".
- Project detail: back link, tech pills under the title, one "Links" row (repository / live demo buttons, new tab) replacing two `h2` link sections.
- Blog detail: `72ch` measure, back link, skeleton loading state, server-side `generateMetadata` (title = post title).
- Visitor-facing copy on `/blogs` and both contact pages (no more endpoint/JSON internals in the lede; the API page is framed as a demo).
- Admin: active nav state via `aria-current` (`admin-nav.tsx` client component); contacts table wrapped in `.table-scroll` for mobile.
