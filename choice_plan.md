# Feature plan — "The Problem is Choice" (choice-driven ideation + generated art)

Status: **BUILT** (D1–D6 locked; C1–C4 delivered) — see `midterm_plan.md` and the walkthrough script.
Owner: product / engineering: Viber. Depends on: existing Ideas store, assistant provider abstraction (`src/lib/ai.ts`), idea form/board.

## Locked decisions

| # | Decision | Locked call |
|---|---|---|
| D1 | Assistant modes | **Replace** — the single-draft suggestion flow is removed entirely; choice-driven ideation is the only AI mode |
| D2 | Providers | **Text choices: the default configured provider (Ollama)** — same abstraction as today. **Images: keyless Pollinations endpoint** — Ollama hosts no image-generation models (its models are text-only; llava-class models understand images but cannot generate them), so the picture step uses the keyless `image.pollinations.ai` endpoint with a **prompt-only fallback** if unreachable. A future `IMAGE_PROVIDER` env can add OpenAI/Stability without UI changes |
| D3 | Picture persistence | **Persist** — `imagePrompt` + `imageUrl` on the idea; file in `data/images/idea-<id>.png` |
| D4 | Narrative placement | **Fill (overwrite) summary + body, editable after** — chosen by engineering: predictable on repeated selections; appending would accumulate stale text across shuffles; the human still edits before saving |
| D5 | Image visibility | **Admin-only** — served by a gated route, same as the ideas API |
| D6 | Timing | **In the midterm** — C1–C4 all land before the Nov 20 recording; the walkthrough gains seed → three choices → pick → picture as its AI segment |

## The concept

From the Oracle scene in *The Matrix Reloaded*: "The problem is choice." Ideation is hard because there are infinite directions. Instead of one AI draft, the assistant becomes an **oracle of options**:

1. You type a few words or sentences (the seed).
2. The AI returns **three distinct narrative paragraphs** — three angles on your seed.
3. You pick one. **Choice is the input.**
4. The AI generates a **picture for the narrative you chose**.

The chosen paragraph becomes the idea's narrative; the picture becomes its artwork. The output is still a normal idea in the CRUD board — this feature is a better front door to the same object.

## User story

> As a writer with a vague notion, I type a seed like "database migrations as relationships" and receive three short, distinct narratives (e.g. a practical explainer, a contrarian take, a personal anecdote angle). I select the one that sparks, see it populate the idea form, and get a generated illustration for exactly that narrative. I edit if I want, save, and the idea — now with narrative and artwork — sits in my board.

## UX flow (inside /admin/ideas)

- The assistant section of `idea-form.tsx` becomes the **choice oracle** (single-draft mode removed): seed textarea (few words/sentences), optional target type (reusing `IdeaTargetType`), one button: **Show me the choices**.
- **Three cards** side by side (stacked on mobile), labeled *Choice 1/2/3*, each with a model-named angle tag ("practical", "contrarian", "personal", …). Section header: *"The problem is choice."*
- **Select** → the paragraph fills summary + body (editable — D4), the chosen card is highlighted. Actions: **Shuffle again** (3 new choices), **Edit seed**.
- **Generate the picture** → enabled only after a choice is selected; loading state (~5–20 s); result shown beside the form and on the idea card after save; **Regenerate picture** available.
- **Brief continuity**: the briefs board's "start from this brief" handoff now pre-fills the **seed** (and brief metadata) instead of the retired draft flow — briefs still feed the oracle.
- Failure states (provider down, refusal, timeout) show inline feedback with retry; the manual flow never breaks.

## API & schema changes

- `src/lib/ai.ts`: `requestChoices(seed, deps)` replaces `requestSuggestion` — same provider abstraction + `SuggestionDeps`-style injection; JSON-array schema `[{ angle, paragraph }]` ×3, distinct angles enforced in the prompt, fence-tolerant parsing, refusal/timeout mapping as today. New `requestNarrativeImage(narrative, deps)` — Pollinations GET, keyless, configurable timeout, returns bytes.
- `POST /api/assistant/choices` (admin-gated, `withRoute`-wrapped, logged) **replaces** the retired `POST /api/assistant` suggestion handler. `GET /api/assistant` stays (provider/config status, now also reporting image-provider reachability policy).
- `POST /api/assistant/image` (admin-gated): body `{ ideaId, narrative }` → generates, stores `data/images/idea-<id>.png`, returns/updates `imageUrl`.
- Idea schema gains **optional** `imagePrompt`, `imageUrl` — backward-compatible validation; old ideas keep working everywhere (board, card, API).
- New `GET /api/images/[ideaId]` (admin-gated): serves the idea's PNG; uuid-validated id (path-traversal safe), content-type pinned.

## Stages (each: build → review → revisions, checks green)

### C1 — Choices + image APIs
- `requestChoices` + `requestNarrativeImage` in `src/lib/ai.ts` (Ollama text path via the configured model; Pollinations image path); retire `requestSuggestion` and the old assistant POST.
- Routes: `/api/assistant/choices` (POST), `/api/assistant/image` (POST), `/api/images/[ideaId]` (GET) — all gated, wrapped, logged.
- Unit tests: choices parsing (3 valid / 2 valid / fenced / refusal), image-route gating + uuid guard, schema back-compat with `imageUrl`/`imagePrompt`.

### C2 — Oracle UI + selection
- `idea-form.tsx` assistant section rebuilt as the choice oracle (seed → 3 cards → select → fill); brief handoff pre-fills the seed.
- e2e updates: seeded choices → select → form prefilled → save → board; the old single-draft assistant checks in the QA scripts are replaced by the new flow; image mocked in CI runs (real Pollinations for the demo).

### C3 — Picture on the idea
- Image bytes → `data/images/idea-<id>.png`; `imageUrl`/`imagePrompt` persisted through the ideas API; `IdeaCard` renders artwork when present; regenerate swaps the file.
- Fallback: provider unreachable → persist `imagePrompt` only + placeholder art + retry offer.

### C4 — Polish + midterm integration
- Copy pass, loading/failed states, `midterm_plan.md` status, and the **midterm walkthrough script rewrite** (the pending ~85-point deliverable): seed → three choices → pick → picture appears on the board becomes the AI segment; rubric mapping (localStorage trace, CRUD sweep, 201 + logs, component props) unchanged.

## Failure & fallback matrix

| Failure | Behavior |
|---|---|
| Choices provider down/timeout/refusal | Inline error + retry; manual idea creation unaffected |
| Fewer than 3 usable choices parsed | Show what parsed (min 1) + "Shuffle again" |
| Image provider down | Persist narrative without image; keep `imagePrompt`; placeholder + retry |
| Image too large / wrong content type | Reject at route level; keep narrative |
| Old ideas without image fields | Render exactly as today (back-compat validation) |

## Out of scope (v1)

Image editing/upload, multiple images per idea, public gallery, image generation for projects/blogs, non-PNG formats, provider-side prompt customization UI, replacing Pollinations with a keyed provider (config-ready, not built).
