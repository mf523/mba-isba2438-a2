# Portfolio — ISBA 2438 Midterm

A Next.js App Router portfolio extended into a small content-creation site: brief planning (browser LocalStorage), an idea board backed by server JSON, full CRUD APIs for every served object, and an optional AI drafting assistant.

## Features

- **Base portfolio** — home, About Me, project list + detail pages (dynamic slug routes), blog list + detail pages, two contact forms (server action and client-side API demo).
- **Briefs (LocalStorage feature)** — private writing briefs planned per piece of content. Saved to `localStorage`, restored after refresh, tolerant of empty or corrupted stored data, synced across tabs. Storage layer: `src/lib/briefs.ts` + `src/lib/briefs-store.ts`.
- **Idea board (custom backend feature)** — ideas stored in `data/ideas.json` behind `/api/ideas`, with edit/delete from the board and one-click "start a blog post / project" prefill.
- **Full CRUD** — projects, blog posts, contact requests, and ideas all have create, read, update, and delete through both the admin screens and the JSON API, persisted to backend JSON.
- **AI assistant (optional)** — drafts an idea from notes, a brief, or an image via Anthropic or a local Ollama model (`src/lib/ai.ts`).
- **Admin studio** — password-protected area (signed HMAC cookie, login rate limiting) with screens for briefs, ideas, blog posts, projects, contact requests, the About page, and site config.

## Getting started

Requirements: Node.js 22+.

```bash
npm install
cp .env .env.local  # or create .env from the table below
npm run dev         # http://localhost:3000
```

Production: `npm run build && npm start`.

### Environment (.env)

| Variable | Default | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | `portfolio-admin` | Admin sign-in password. The default logs a warning — set it for real deployments. |
| `ADMIN_SESSION_SECRET` | generated | HMAC secret for session cookies. Auto-generated at `data/.session-secret` when unset. |
| `PORTFOLIO_DATA_DIR` | `./data` | Directory for JSON stores. |
| `AI_PROVIDER` | `anthropic` | `anthropic` or `ollama`. |
| `ANTHROPIC_API_KEY` | — | Anthropic API key when `AI_PROVIDER=anthropic`. |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama endpoint when `AI_PROVIDER=ollama`. |
| `OLLAMA_MODEL` | — | Ollama model name (e.g. `deepseek-v4.1-flash:cloud`). |
| `OLLAMA_API_KEY` | — | Optional bearer token for Ollama. |

## API

All handlers return JSON with `ok`, log one line per request (`[api] METHOD /path → status`), and cap request bodies at 1 MB.

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/projects` | GET, POST | GET public, POST admin | 201 on create; 409 duplicate slug |
| `/api/projects/[slug]` | GET, PUT, DELETE | GET public, rest admin | slug immutable |
| `/api/blogs` | GET, POST | GET public, POST admin | 201 on create |
| `/api/blogs/[slug]` | GET, PUT, DELETE | GET public, rest admin | |
| `/api/contacts` | GET, POST | GET admin, POST public | POST returns 201; archived flag |
| `/api/contacts/[id]` | GET, PUT, DELETE | admin | PUT archives/unarchives |
| `/api/ideas` | GET, POST | admin | |
| `/api/ideas/[id]` | GET, PUT, DELETE | admin | |
| `/api/assistant` | GET, POST | admin | GET reports provider/config status; POST drafts a suggestion (multipart, image ≤ 10 MB) |
| `/api/contact` | POST | public | alias kept for Assignment 2 compatibility; same handler as `POST /api/contacts` |

## Data storage

- **Server JSON** — `data/*.json` (`projects`, `blogs`, `ideas`, `contact-submissions`, `about`, `site-config`). Writes are queued and atomic (temp file + rename). Missing files self-heal from defaults; corrupted files raise a handled error rather than being overwritten. `contact-submissions.json` is runtime data and intentionally **not** tracked in git; the content stores (`projects`, `about`, `site-config`) are tracked so a fresh clone shows real content.
- **Browser LocalStorage** — briefs under the key `mba-isba2438-a2:briefs`. Serialized on save, parsed and filtered on read; unreadable data falls back to an empty board with a visible notice.

## Architecture map

| Area | Files |
|---|---|
| JSON store + queue | `src/lib/json-store.ts` |
| Content stores & validation | `src/lib/projects.ts`, `blogs.ts`, `contact-submissions.ts`, `ideas.ts`, `briefs.ts`, `about.ts`, `site-config.ts` |
| API helpers (auth, body parsing, logging, error wrapper) | `src/lib/api.ts` |
| Sessions & rate limiting | `src/lib/session.ts`, `src/lib/rate-limit.ts` |
| AI providers | `src/lib/ai.ts` |
| Shared UI components | `src/components/` (cards, fields, tags, layout shells — inventory in `midterm_plan.md`) |
| Admin screens | `src/app/admin/(protected)/` |

## Quality checks

```bash
npm run lint      # eslint
npm test          # unit tests for every store + helpers
npm run check     # lint + production build
npm run qa        # 49-check end-to-end suite (needs `npm start` on :3100 + headless Chrome)
npm run qa:design       # computed-style contrast/overflow audit (light + dark)
npm run qa:screenshots  # full-page screenshots into /tmp/shots
npm run test:ollama     # connectivity check for the Ollama provider
```

## License

[MIT](LICENSE)
