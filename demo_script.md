# Midterm Walkthrough — Video Submission Script

Estimated duration: **9:00–9:30**, against the 10:00 hard cutoff (recording stops automatically).
Read the blockquotes as narration, adapting the wording to your speaking style. *Italic text* is screen-recording direction, not spoken. Rubric IDs in the right column show what each segment earns.

## Before recording (setup checklist)

- [ ] `npm run build && npm start` running on **:3100**, terminal **visible** (server logs must be readable on camera).
- [ ] Browser: signed out of admin (clear the session cookie or incognito) for the login moment.
- [ ] DevTools ready: **Network** tab (preserve log ON) and **Application → Local Storage** pane.
- [ ] `data/contact-submissions.json` open in the editor (fresh view) for the persistence shot.
- [ ] `src/lib/briefs-store.ts`, `src/lib/ai.ts`, `src/components/idea-card.tsx`, `src/lib/json-store.ts` open in editor tabs.
- [ ] Ollama running with the configured model; internet available for the image service.

| Time | Segment | Rubric |
| --- | --- | --- |
| 0:00–0:45 | Portfolio tour (A2 pages intact) | MIDTERM-07 |
| 0:45–2:15 | Briefs: LocalStorage save → refresh → retrieve; empty + corrupt handling | MIDTERM-01/02/03 |
| 2:15–3:30 | The oracle: seed → three choices → pick → idea | MIDTERM-04/08 |
| 3:30–4:15 | Picture generation on the idea card | MIDTERM-04 |
| 4:15–6:00 | CRUD sweep across all four object types | MIDTERM-05 |
| 6:00–7:00 | API deep-dive: 201 + server logs + JSON file | MIDTERM-06 |
| 7:00–8:30 | Code explanation: fetch → props; LocalStorage both flows | MIDTERM-08/09/10 |
| 8:30–9:15 | Design choice, storage limitation, testing decision | MIDTERM-11 |
| 9:15–9:30 | Repo, license, close | MIDTERM-13 |

---

### 0:00–0:45 — Portfolio tour

*Start at `/`. Scroll through home (hero + featured grid), About Me, My Projects, one project detail, Blogs.*

> This is my portfolio from Assignment 2, extended into a content-creation studio. All the original pages still work — home, about, project details on dynamic slug routes, and the blog — and on top of them I've added two meaningful features: briefs stored in the browser, and an idea board backed by the server. Both get AI assistance.

### 0:45–2:15 — Briefs (LocalStorage feature)

*Navigate to **Admin**, sign in with the admin password, open **Briefs**.*

> Briefs are my planning notes — what a piece of content is, who it's for, how it should sound. They're private working notes, so they live in browser LocalStorage, not on the server.

*Fill the brief form: title "Migration story", type Blog post, audience, tone, two key points. Click save. Point at the new brief card. Press **F5**.*

> I save the brief — it's in LocalStorage under the key mba-isba2438-a2:briefs. Watch: I refresh the page — the brief is still here, restored from storage.

*Open DevTools → Application → Local Storage → show the JSON. Then set its value to `not json at all` and reload.*

> And it degrades gracefully. If I corrupt the stored data — I'll just type garbage into the storage entry and reload — the board tells me the saved briefs couldn't be read and starts from an empty list instead of crashing. Empty storage is handled the same way: an empty board, not an error.

*Restore the storage value (or re-create the brief).*

### 2:15–3:30 — The oracle (custom backend feature: ideas)

*Open **Ideas**. Point at the "The problem is choice." panel.*

> Ideation is hard because the problem is choice. So instead of one AI draft, the assistant is an oracle of options: I give it a seed and it returns three distinct narrative directions.

*Type the seed: "database migrations explained through bad relationships". Click **Show me the choices**. While loading, narrate.*

> This call goes to my API at /api/assistant/choices. The server sends the seed to the configured language model — here, a local Ollama model — asking for exactly three distinct angles, and returns them as JSON.

*Three cards appear. Hover each, then click one.*

> Three different takes: practical, contrarian, personal. Choosing one fills the idea's summary and body — and it stays editable. The choice is the input; I'm still the author.

*Edit the title, tweak a word in the body, click **Save idea**.*

> I edit and save — the idea is now a normal record on the server, stored in data/ideas.json behind the ideas API.

### 3:30–4:15 — Picture generation

*On the new idea's card, click **Generate picture**. While it loads:*

> The narrative I picked now drives the artwork: the server builds an image prompt from the idea's body, calls an image service, and stores the picture on disk. The idea record keeps the image URL and the exact prompt that produced it.

*The artwork appears on the card. Click **Regenerate picture** briefly or note it, then move on.*

### 4:15–6:00 — CRUD sweep (all four object types)

*Fast, deliberate clicks:*

> Every object my API serves has a complete create, read, update and delete interface — ideas, blog posts, projects, and contact requests.

- *Ideas: **Edit** the oracle idea → change a word → **Save changes**. Then **Delete** a scratch idea and confirm.*
- *Blog posts: create from the oracle idea via **Start blog post** (show prefill), save; **Edit** it; **Delete** it.*
- *Projects: create one, edit it, delete it.*
- *Contact requests: submit one from the public form (keep this submission for the next segment!), then archive it, unarchive it, and leave it.*

> Every operation goes through the API and persists to backend JSON — close a tab, come back tomorrow, it's all still there.

### 6:00–7:00 — API deep-dive (201 + logs)

*Open DevTools → Network, clear. Go to the public **Contact (API)** page, submit a valid message. Click the POST request in Network.*

> Here's the API doing its thing. The form posts JSON to /api/contacts — status 201 Created. And in the server terminal, every request logs one line through a shared logging module — you can see the 201 right there.

*Show the terminal line `[api] POST /api/contacts → 201`. Open `data/contact-submissions.json` — the new message is on disk.*

> The submission is persisted to the JSON store on the server. Create, read, update, delete — all four verbs work for every object type, through the interface and through the API.

### 7:00–8:30 — Code explanation

*Open `src/app/admin/(protected)/ideas/idea-board.tsx`, then `src/components/idea-card.tsx`.*

> Componentization: the idea board is the parent — it fetches from the API, holds the state, and renders one IdeaCard per idea. IdeaCard is purely presentational: it receives the idea object through props, plus optional callbacks like onEdit, onDelete, and onGenerateArtwork. It never fetches anything itself. That's the parent-to-child data flow the custom feature is built on.

*Open `src/lib/briefs-store.ts` and `src/lib/briefs.ts`. Trace both directions:*

> The LocalStorage feature works in two directions. Writing: the form state is a plain array of brief objects; on save, serializeBriefs JSON-stringifies it and localStorage.setItem stores it under one key. Reading: on load — and on every change, via useSyncExternalStore — the raw string comes back, JSON.parse runs it through readBriefsStorage, which validates every entry against the brief shape and drops anything malformed; the parsed array becomes state and the board renders it. Refresh is just read-again.

*Open `src/lib/json-store.ts` briefly.*

> On the server, the same pattern with JSON files: every write is queued and atomic — write to a temp file, rename — so concurrent submissions can't clobber each other.

### 8:30–9:15 — Design choice, limitation, testing decision

> Three things worth explaining. Design choice: the assistant gives three choices instead of one draft — ideation benefits from options, and picking keeps the human in the loop; the chosen text lands in editable form fields, so the AI proposes and the author decides. Browser storage limitation: LocalStorage is per-browser and per-machine, usually capped around five megabytes, and it can be disabled or full — my write path catches that and falls back to an in-memory snapshot with a warning, so the UI keeps working though the data won't survive a refresh. Testing decision: the JSON store is unit-tested with temp directories — including corrupt-data cases — and there's a 58-check end-to-end suite, `npm run qa`, that drives the real UI in headless Chrome: it caught real bugs, including races between React hydration and scripted clicks.

### 9:15–9:30 — Close

> Source code is in the public GitHub repo, MIT licensed, with the full API table and the test suite in the README. Thanks for watching.

---

## Rehearsal checklist (verify against actual footage)

- [ ] All A2 pages loaded and usable (home, about, both project details, blogs).
- [ ] Brief saved → **F5** → brief restored; corrupt-storage variant shown with the warning notice.
- [ ] Seed → exactly three choice cards → one chosen → form filled → edited → saved.
- [ ] Picture generated on the idea card and visible.
- [ ] CRUD shown for ideas, blogs, projects, contacts (create/read/update/delete each).
- [ ] Network tab showed `POST /api/contacts` → **201 Created**; terminal showed `[api] … → 201`; JSON file showed the record.
- [ ] IdeaCard props flow explained from the board (parent fetch → props).
- [ ] LocalStorage explained in both directions (state → serialize → setItem; getItem → parse → validate → state → display).
- [ ] Design choice, storage limitation, and testing decision each explained.
- [ ] Total runtime ≤ 10:00 (target 9:30).
