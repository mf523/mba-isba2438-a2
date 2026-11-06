# BUGS.md

QA findings for the contact-form persistence layer, success-feedback UI, and admin mode.
All findings verified empirically against the current build (Next.js 16.4.5, production build via `next start`).

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| BUG-01 | Corrupted JSON store silently wipes submission history | High | Fixed & verified |
| BUG-02 | Concurrent submissions lose updates | Medium | Fixed & verified |
| BUG-03 | Success banner fade-out never plays (JS unmount preempts CSS animation) | Low | Fixed & verified |
| BUG-04 | Data directory path depends on `process.cwd()` | Medium | Fixed & verified |
| BUG-05 | Empty admin password authenticates when `ADMIN_PASSWORD` is set to empty | Medium | Fixed & verified |
| BUG-06 | `BUGS.md` documents the wrong data-directory env var | Low | Fixed & verified |
| BUG-07 | Browser tab title does not follow site config | Low | Fixed & verified |

---

## BUG-01 — Corrupted JSON store silently wipes submission history

- **Severity:** High (permanent, silent data loss)
- **Location:** `src/lib/contact-submissions.ts:40-48` (`readSubmissions`) and `:51-70` (`saveContactSubmission`)

### Description

Any read error is treated as "empty store". If `data/contact-submissions.json`
becomes corrupted (e.g. truncated by a crash mid-write — the write is
non-atomic), the next successful submission overwrites the file with a
single-entry array. The entire submission history is lost with no error
surfaced to the user or logs.

### Root cause

1. `readSubmissions` uses a broad `catch { return [] }`, conflating "file does
   not exist yet" (benign first-run case) with "file exists but is
   unreadable/corrupt" (data-loss case).
2. `saveContactSubmission` writes directly to the live file
   (`writeFile(DATA_FILE, ...)`) instead of writing to a temp file and
   renaming, so an interrupted write leaves truncated JSON behind.

### Reproduction steps

1. Create `data/contact-submissions.json` containing 2 valid submissions.
2. Corrupt the file: `printf '[\n  {"id":"seed-1", "na' > data/contact-submissions.json`
   (simulates a crash mid-write).
3. Submit the contact form once (or call `saveContactSubmission(...)` directly).
4. Read the file back.

**Expected:** the save either succeeds while preserving prior entries, or
fails loudly; history is never destroyed.

**Actual:** file contains exactly 1 entry (the new one). 0 of 2 prior
submissions survive. Verified: entries after save = 1, seeds preserved 0 of 2.

### Resolution (verified)

`readSubmissions` now only treats `ENOENT` as "empty store"; malformed or
structurally invalid JSON throws a loud
`Contact submissions store is corrupt: <file>` error, and the action returns
its generic failure state without touching the file. Writes are atomic
(temp file + `rename`), so the corruption window is closed. Verified: corrupt
store + save → throws, file bytes unchanged, seeds recoverable; benign
first-run and repaired-store paths still work.

---

## BUG-02 — Concurrent submissions lose updates

- **Severity:** Medium (silent loss under concurrency)
- **Location:** `src/lib/contact-submissions.ts:51-70` (`saveContactSubmission`)

### Description

Saving performs an unsynchronized read-modify-write: read the array, push,
write the whole file. Two near-simultaneous submissions both read the same
snapshot before either write lands; the second write overwrites the first,
permanently losing one submission.

### Root cause

Time-of-check-to-time-of-use race: no file lock, queue, or single-writer
serialization around the read-modify-write cycle.

### Reproduction steps

1. Seed `data/contact-submissions.json` with 2 entries.
2. Fire two saves concurrently:

   ```ts
   await Promise.all([
     saveContactSubmission({ name: "A", email: "a@example.com", message: "x" }),
     saveContactSubmission({ name: "B", email: "b@example.com", message: "y" }),
   ]);
   ```

3. Count entries in the file.

**Expected:** 4 entries (2 seed + 2 new).

**Actual:** 3 entries — one concurrent save was lost. Confirmed on the first
attempt (race is timing-dependent; repeat if not observed).

### Resolution (verified)

All saves run through an in-process FIFO write queue (`enqueue`), serializing
the read-modify-write cycle per Node process. Verified: 5 rounds of 3
concurrent saves against a 2-entry seed — every round ended with exactly 5
entries and no leftover temp files.

---

## BUG-03 — Success banner fade-out never plays

- **Severity:** Low (cosmetic)
- **Location:** `src/app/contact-me-server-form/contact-form.tsx:20-24` (5s JS timer) and
  `src/app/globals.css` `.feedback-autohide` (`feedback-expire` 0.5s ease 5s forwards)

### Description

The success banner's dismissal is driven by two mechanisms with the same
5-second budget but different media and epochs: a JS `setTimeout` unmounts the
element at ~5.0s, while the CSS animation hides it gradually between 5.0s and
5.5s. The JS unmount wins, so users see an abrupt pop-out and the fade is
never visible. The 5s constant is also duplicated in two places (drift risk).

### Root cause

Duplicated timing logic across JS and CSS; component unmount preempts the
animation before its visible phase starts.

### Reproduction steps

1. Open `/contact-me-server-form`, submit a valid message.
2. Poll the banner element every 100ms and record its DOM presence and
   computed `opacity`.

**Expected:** banner visible at `opacity` between `1` and `0` during ~5.0-5.5s
(fade), then hidden.

**Actual (CDP poll):**

```
t=2.03s banner in DOM opacity=1
t=5.14s banner GONE
```

No intermediate opacity observed — the fade window never played.

### Resolution (verified)

Single timing source in JS: `SUCCESS_VISIBLE_MS` (5000) fires a state flag
that adds `.feedback-fading`, and `FADE_MS` (500) later unmounts it; CSS owns
only the visual transition (opacity transition on the same 500ms duration).
Verified via CDP opacity poll: `opacity=1` → `0.78` → `0.32` → `0.11` →
`0.02` → removed at ~5.55s — the fade plays, then the banner unmounts.

---

## BUG-04 — Data directory path depends on `process.cwd()`

- **Severity:** Medium (deployment/config hazard; currently masked because the
  server is always started from the repo root)
- **Location:** `src/lib/contact-submissions.ts:10-11`

### Description

The store path is `path.join(process.cwd(), "data")`. Starting the server
(or any script importing the module) from a different working directory makes
submissions land in a different `data/` directory — or fail on read-only
filesystems (e.g. serverless deployments).

### Root cause

Runtime data path anchored to the process working directory instead of the
application root (resolved module-relative) or an env-configured path.

### Reproduction steps

1. From a shell whose cwd is NOT the repo (e.g. `/tmp/cwd-test`), run a script
   that imports `src/lib/contact-submissions.ts` and calls
   `saveContactSubmission(...)`.
2. Check both locations for the new entry.

**Expected:** submission is stored in the application's `data/` directory
regardless of cwd.

**Actual:** entry landed in `/tmp/cwd-test/data/contact-submissions.json`;
the repo `data/` file did not receive it.

### Resolution (verified)

The store directory is `PORTFOLIO_DATA_DIR` (env) when set, falling back
to `process.cwd()/data` — the contract `next dev` / `next start` guarantee.
Verified: foreign cwd + env var → submission landed in the configured
directory and not the repo; no env + cwd at repo root → landed in repo
`data/`.

---

## BUG-05 — Empty admin password authenticates when `ADMIN_PASSWORD` is set to empty

- **Severity:** Medium (authentication bypass under a plausible misconfiguration)
- **Location:** `src/lib/session.ts` (`isCorrectAdminPassword`)

### Description

The admin password fallback uses the nullish-coalescing operator:

```ts
const expected = process.env.ADMIN_PASSWORD ?? "portfolio-admin";
```

`??` only substitutes the default for `null`/`undefined`. Setting
`ADMIN_PASSWORD=""` in the environment therefore makes the **empty string**
the expected password, and any login attempt with a blank password succeeds.

### Root cause

`??` (nullish coalescing) does not treat an empty string as "unset". An
explicitly empty env value replaces the safe default instead of falling back
to it.

### Reproduction steps

1. Start the server with an empty password configured:
   `ADMIN_PASSWORD="" npx next start -p 3100`
2. Open `/admin/login`, submit with the password field left blank.
3. Observe the response and follow-up request to `/admin/contacts`.

**Expected:** login is rejected ("Incorrect password.") and the default
password fallback is used.

**Actual (verified):** `303` redirect to `/admin/site-config`, an
`admin_session` cookie is issued, and `/admin/contacts` renders the
admin UI ("Admin mode" badge present).

### Resolution (verified)

`isCorrectAdminPassword` (and the session-secret fallback) now use `||`
instead of `??`, so an explicitly empty env value falls back to the safe
default. Verified with a 5-case matrix: empty env + blank password →
rejected (200, no access); empty env + default password → accepted; no env +
default password → accepted; custom env + matching password → accepted;
custom env + wrong password → rejected.

---

## BUG-06 — `BUGS.md` documents the wrong data-directory env var

- **Severity:** Low (documentation defect)
- **Location:** `BUGS.md` BUG-04 "Resolution" section; actual implementation in
  `src/lib/json-store.ts` (`dataDir`)

### Description

The BUG-04 resolution text named the env override `CONTACT_SUBMISSIONS_DIR`.
The implementation actually shipped in the shared store module reads
`PORTFOLIO_DATA_DIR` (applied to every JSON store, not just contact
submissions).

### Root cause

The env var was renamed from the single-purpose `CONTACT_SUBMISSIONS_DIR` to
the shared `PORTFOLIO_DATA_DIR` during the json-store refactor; the document
was not updated with the code.

### Reproduction steps

1. Read `BUGS.md`, BUG-04 "Resolution": claims the override is
   `CONTACT_SUBMISSIONS_DIR`.
2. Read `src/lib/json-store.ts`, `dataDir()`: reads `process.env.PORTFOLIO_DATA_DIR`.

**Expected:** documentation matches the implementation.

**Actual:** names disagree; following the documented name has no effect.

### Resolution (verified)

The BUG-04 resolution section now documents `PORTFOLIO_DATA_DIR`, matching
`dataDir()` in `src/lib/json-store.ts`. The remaining mentions of
`CONTACT_SUBMISSIONS_DIR` in this section are the historical description of
this defect. Verified by cross-reading both files.

---

## BUG-07 — Browser tab title does not follow site config

- **Severity:** Low (cosmetic inconsistency)
- **Location:** `src/app/layout.tsx` (`metadata` export)

### Description

Saving "Site config" live-updates the header brand, tagline, and footer
(via `updateTag` on the `site-config` cache tag), but the static `metadata`
export still hardcodes `default: "My Portfolio"` and
`template: "%s | My Portfolio"`. Browser tab titles keep showing the old
site name after the setting changes.

### Root cause

The root layout exports a static `metadata` object, which is evaluated once
with hardcoded strings instead of deriving from the site config. Static
`metadata` cannot read runtime data; `generateMetadata` is required.

### Reproduction steps

1. Sign in at `/admin`, open **Site config**, change **Site name** to a new
   value (e.g. `Brand New Name`), save. The header brand updates immediately.
2. Look at the browser tab title on any page.

**Expected:** tab title reflects the configured site name.

**Actual (verified):** tab title remains `Site Config | My Portfolio` —
the hardcoded default — while the header shows `Brand New Name`.

### Resolution (verified)

The root layout now exports `generateMetadata` deriving `title.default` and
`title.template` from `getSiteConfig()`. Verified: with the configured site
name, `/` renders `<title>Brand New Name</title>`, sub-pages render
`<title>About Me | Brand New Name</title>`; saving a new site name updates
all tab titles on the next request without a server restart; the configured
values were restored afterwards.

---

## Final regression (all fixes in place)

- `npm run lint` and `npm run build` — clean
- Invalid submission (blank name/message, malformed email) → all field errors
  returned, no file written
- Valid submission → success state returned, exactly 1 entry persisted
- Success-banner persistence suite (submit → auto-hide at 5s; re-submit →
  banner replays; back/forward via router cache and bfcache → never persists
  indefinitely) — all assertions pass
