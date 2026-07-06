# Germix — Project Requirements Document

**Version:** 1.0  
**Last Updated:** 2026-06-07  
**Status:** Draft — Pathogen Book layout expanded (§9): two-panel open book, PNG-only chrome, left microbe grid, right detail + characteristic cards.

---

## 0. Change Log

| Version | Date | Summary |
|---|---|---|
| 1.0 | 2026-06-07 | **Pathogen Book layout specified (§9):** two-panel open book; left page = microbe grid per category with PNG cards, star rating, gram badge, locked/unlocked state; right page = selected microbe detail with large card + all ClueCard PNGs grouped by category. All visual chrome is PNG-based — no CSS-drawn UI elements. Category navigation via tab strip. Seven open questions added (PB-1 through PB-7). |
| 0.9 | 2026-05-18 | **Applied all 0.8 schema changes that were logged but never written to the schema:** `enum AnswerOption { A B C D }` added; `Microbe.answerImageUrl String` added; `Score.microbeId`/`answeredMicrobeId` now proper named `@relation` to `Microbe` (`"CorrectMicrobe"` / `"AnsweredMicrobe"`); `Score.gameMode` removed; `ClueCard.imageUrl` non-nullable; `PostTest.score Int @default(0)` non-nullable; `PostTestQuestion.correctOption AnswerOption`; `ApprovedUsername` gains `registeredAt DateTime?` + 1-to-1 `Player?` back-relation; `Player` gains `approved ApprovedUsername` FK (DB-enforces every player was whitelisted). **Over-engineering fixed:** `SessionMicrobe` and `PlayerMicrobeUnlocked` surrogate PKs removed — now use composite `@@id` (natural key). **Index added:** `Score.@@index([microbeId])` for admin per-microbe accuracy queries. |
| 0.8 | 2026-05-18 | **Schema best-practice fixes (logged only — not applied until 0.9):** added `enum AnswerOption { A B C D }` for type-safe posttest answers; `Microbe.answerImageUrl String` added (required for Answer panel, End Screen, Pathogen Book); `Score.microbeId`/`answeredMicrobeId` now proper `@relation` to `Microbe` (was bare String — no referential integrity); `Score.gameMode` removed (redundant, derivable via session join); `ClueCard.imageUrl` is now non-nullable `String` (all cards are PNGs); `PostTest.score` is now non-nullable `Int @default(0)`; `PostTestQuestion.correctOption` now typed as `AnswerOption`; `ApprovedUsername` gains `registeredAt DateTime?` and a 1-to-1 relation to `Player` (enforces that every registered player was whitelisted at DB level). |
| 0.7 | 2026-05-18 | **Session structure changed:** 5 rounds × 1 microbe = 5 total identifications to win (was 5 × 3 = 15). `MICROBES_PER_ROUND` is now 1. Max session score is now 500. All references updated. **Schema fixes:** `PlayerMicrobeSeen` renamed to `PlayerMicrobeUnlocked` (semantic clarity); `Json microbeIds` replaced with `SessionMicrobe` relation model (enforces no-duplicate microbes via DB constraint); `Score.microbeInRound` removed (always 1, redundant); `GameSession.currentMicrobeInRound` removed (same reason); `PostTestQuestion` model added so `/api/posttest` can compute scores server-side. |
| 0.6 | 2026-05-17 | **Schema fixes:** removed redundant `Score.cardsOpened` (derive from `cardSlotsOpened.length`); replaced ad-hoc `Microbe.isAnaerobe` boolean with extensible `tags MicrobeTag[]`; `PostTest.period` is now a `PostTestPeriod` enum; clarified `GameSession.currentRound`/`currentMicrobeInRound` exist for server-side anti-cheat sequencing (not client resume). **API fixes:** added `POST /api/auth/signup` (was a spec hole vs §4.1); added §11 preamble defining response envelope and error format; specified `/reveal` and `/answer` request and response bodies; generalized `PUT /api/admin/deadline` to `PUT /api/admin/config/:key`; `/api/leaderboard` is now explicitly public. **New §10 Visual Design Direction:** tokens, type, color, motion, accessibility constraints. |
| 0.5 | 2026-05-17 | Wrong-answer flow finalized (reveal all cards + correct answer → Next button). No auto-reveal — all 5 cards start hidden, player opens manually. Account creation: self-registration with username whitelist (CSV import). Leaderboard: username display. Posttest: show score (X/30), no pass/fail gate. Pathogen Book: unlocks on correct answer only. Tutorial: YouTube embed. Session structure noted as scalable (5×N). PNG naming convention confirmed. |
| 0.4 | 2026-05-17 | **Phaser.js removed — pure React/Next.js.** Google Sheets removed — Supabase only, CSV export. Login field changed to username (1-10 chars). Score formula finalized (100 max, card-based penalty only, no time factor). Session structure changed to 5 rounds × 3 microbes = 15 total. Leaderboard changed to top 5, equal rank for ties. Posttest changed to 30-question in-game web form, shuffled, locks game 2–3 days before exam. Card count changed to 600 (from 900). Focus on bacteria first. Admin dashboard marked optional. Sound: 1 min MP3 loop. Mobile: force landscape. No animations for v1. |
| 0.3 | 2026-05-15 | Removed REDCap. Auth switched to custom JWT + bcrypt. API redesigned to be server-authoritative. |
| 0.2 | 2026-05 | Migrated stack to Next.js 14 + Phaser.js 3. |
| 0.1 | — | Initial draft. |

---

## 1. Project Overview

An educational web-based card game for a research study on microbiology learning at Faculty of Medicine Ramathibodi Hospital, Mahidol University. Players identify pathogens (bacteria — MVP; parasite as next phase) using progressive clue cards.

**Research Context**
- Pretest: Google Form only (external — not part of the game)
- Posttest: In-game 30-question web form, triggered by date proximity to exam (2–3 days before)
- Data sink: Supabase Postgres (source of truth) + on-demand CSV export
- Timeline: Draft June 2026 → Finalize June → Test July–August → Release September–October 2026

---

## 2. Tech Stack

### 2.1 Frontend / Game Layer

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router, TypeScript) | All game UI rendered as React components — no canvas engine |
| Styling | Tailwind CSS | Entire UI including game board |
| State | React state / Context | Game state managed in React |
| Validation | zod | Shared request/response schemas |

> **Note:** Phaser.js has been removed. The entire game (card display, reveal interactions, answer drag-and-drop, win/lose popups) is built with React + Tailwind CSS only.

### 2.2 Backend / API Layer

| Layer | Technology | Notes |
|---|---|---|
| Runtime | Next.js API Route Handlers (TypeScript) | Co-located with frontend |
| ORM | Prisma | Schema-first; pooled connection on Vercel |
| Database | Supabase Postgres | Managed; PITR enabled during data collection |
| Auth | Supabase Auth + approved-username whitelist | Sessions managed by Supabase; `Player.id` is the auth UID |
| Storage | Supabase Storage | 600 card PNGs (see §2.3 for rationale) |
| Error tracking | Sentry | Client + server |

### 2.3 Card Asset Storage — Supabase Storage (Recommended)

600 PNGs should live in **Supabase Storage**, not `public/assets/`.

| Approach | Pros | Cons |
|---|---|---|
| **Supabase Storage** ✅ | CDN delivery; no git bloat; update cards without redeploy; bucket access control | Requires seed script to register URLs in DB |
| `public/assets/` | Simple; zero config | Commits 600 binary files to git (~hundreds of MB); redeployment required for every card update |

**Decision:** Use Supabase Storage for all card PNGs. `public/assets/` is reserved for small, infrequently-changed files: BGM MP3, UI sprites, favicon.

### 2.4 Hosting

| Component | Host |
|---|---|
| Next.js app | Vercel |
| Database | Supabase |
| Card assets | Supabase Storage (CDN) |

---

## 3. Architecture Decisions

### ADR-1: Supabase Auth with approved-username whitelist
- **Context:** The app needs username/password auth, but passwords should live in Supabase Auth rather than in the game database.
- **Decision:** `/api/auth/signup` validates `username` against `ApprovedUsername`, creates the Supabase Auth user, then inserts `Player` with `id = Supabase Auth UID`. `/api/auth/login` signs the player in through Supabase Auth and the session is stored in Supabase-managed cookies. `requireAuth()` reads the Supabase session and loads `Player` by auth UID.

### ADR-2: Server is the source of truth for rounds (anti-cheat)
- **Context:** Client-computed scores are trivially forgeable.
- **Decision:** Server (a) picks the microbes for the game and stores them as `SessionMicrobe` rows (one per round, `@@unique([sessionId, microbeId])` prevents duplicates), (b) serves card content when the player requests a reveal, (c) computes the score when the player submits an answer. All 5 cards start hidden — the server has no auto-reveal. Client never sends a score — only inputs (`answeredMicrobeId`, `cardSlotsOpened`).

### ADR-3: Prisma is the security boundary
- **Context:** All writes go through Next.js API routes. `requireAuth()` is the authorization check.

### ADR-4: Vercel + Supabase connection pooler
- **Decision:** `DATABASE_URL` points to Supabase transaction-mode pooler (`?pgbouncer=true&connection_limit=1`). `DIRECT_URL` is for `prisma migrate` only.

### ADR-5: No Google Sheets, no REDCap — Supabase is the only data sink
- **Decision:** All data stored in Supabase Postgres. Research team exports CSV on demand via `GET /api/admin/export.csv`. No external sync needed.

### ADR-6: No Phaser.js — pure React
- **Decision:** The game board, card reveals, drag-and-drop answer selection, and all popups are React components. This eliminates the Phaser/React bridge complexity and makes the entire UI testable with standard React testing tools.

---

## 4. Login & Account Creation

### 4.1 Sign-Up Flow (First Time)

Students self-register inside the game. Only usernames that appear on the approved whitelist (imported from Google Form responses) are accepted, and the username is case sensitive.

```
Research team exports approved usernames from Google Form
  → Dev (or admin endpoint) imports CSV → creates ApprovedUsername whitelist rows
  → Student opens game → clicks "Sign Up"
  → Enters username → server checks ApprovedUsername table
        If not in whitelist → error: "Your username is not registered.
                      Please complete the pre-test form first."
        If already registered → error: "Account already exists. Please log in."
        If approved + new → student sets a password (6+ chars)
      → Supabase Auth user created → Player row created → session cookie set → Home page
```

### 4.2 Login Flow (Returning Player)

1. **Page 1 — Username**
   - Input: username (1-10 chars)
   - Error if not found: _"Username not found."_
   - On valid username → Page 2

2. **Page 2 — Password**
   - Input: password (5–20 characters)
  - `POST /api/auth/login` → Supabase Auth sign-in → session cookie
   - On success → Page 3 (Home)
   - Error if wrong: _"Incorrect password. Please try again."_

### 4.3 Whitelist Import

Admin uploads a CSV of approved usernames via `POST /api/admin/import-usernames`. The CSV has one column: `username`. Duplicate imports are idempotent (upsert). This is the only way to add valid usernames — the game itself does not validate against Google Form directly.

### 4.4 Frontend Contract

- Signup body: `{ username, password }`
- Login body: `{ username, password }`
- `username` is case sensitive and must match the whitelist exactly
- Backend returns `201`/`200` with `{ id, username }` on success
- Error responses use the Section 12.3 envelope and the frontend should display `error.message` inline

---

## 5. Score Formula (Finalized)

### Per-Round Rules

- **Maximum score per microbe:** 100 points
- **Requirement:** Player must open at least 1 clue card before submitting an answer. The answer button is disabled until the first card is opened.
- **Wrong answer:** 0 points + lose 1 heart
- **Time:** Tracked for admin reference only. Does **not** affect score.

### Card Penalty

| Cards Opened | Penalty | Score (if correct) |
|---|---|---|
| 1 | −0 | **100** |
| 2 | −20 | **80** |
| 3 | −40 | **60** |
| 4 | −60 | **40** |
| 5 | −80 | **20** |

Formula:
```ts
// src/lib/scoring.ts
export function calculateRoundScore(cardsOpened: number, correct: boolean): number {
  if (!correct) return 0;
  return Math.max(0, 100 - (cardsOpened - 1) * 20);
}
```

### Session Score

- Total session score = sum of all round scores (up to 5 rounds × 100 max = **500 max total**)
- `Player.totalScore` accumulates across all completed game sessions
- Incomplete sessions (0 hearts) do **not** update `totalScore` or `gamesPlayed`

---

## 6. Game Structure

### 6.1 Session Structure

```
Game Session
├── Round 1 — Microbe 1 (identify from clue cards)
├── Round 2 — Microbe 2
├── Round 3 — Microbe 3
├── Round 4 — Microbe 4
└── Round 5 — Microbe 5
                        Total = 5 microbe identifications to win
```

- **3 hearts per session** (shared across all 5 microbes)
- Wrong answer = −1 heart → all cards revealed + correct answer shown → "Next" button
- 0 hearts = game over (session not counted)
- Win = complete all 5 microbe identifications

> **Scalability note:** The constant `MICROBES_PER_ROUND = 1` is the only value to change if the structure expands in the future. Use this constant everywhere instead of hardcoding `1`.

### 6.2 No Session Persistence

If the player closes the browser or tab mid-session:
- Progress is **not saved**
- Next game start begins a fresh session from Microbe 1
- Partial sessions are recorded in DB for drop-off research analysis but do not affect `totalScore` or `gamesPlayed`

### 6.3 Per-Microbe Flow

1. Player sees **5 card slots — all hidden** at start (no auto-reveal)
2. Player opens at least 1 card manually before the answer button activates
3. Player can open additional cards one by one (each costs points — see §5)
4. Player selects an answer from the scrollable answer panel and submits (see §8)
5. Server validates → computes score

**If correct:**
- Score added → advance to next microbe

**If wrong:**
- −1 heart
- All 5 cards are immediately revealed
- Correct microbe answer card shown
- Player clicks **"Next"** to continue to the next microbe
- No retry on the same microbe; score for this microbe = 0

---

## 7. Win / Game-Over Popup (End Screen)

Displayed after the last microbe (win) or when hearts reach 0 (lose). This is a React modal — **no page navigation**.

### Layout

Scrollable rows — one row per microbe attempted. If the player lost on microbe 4, there are 4 rows.

```
┌─────────────────────────────────────────────────────────────┐
│  [WIN! / GAME OVER]                          [Play Again]   │
├─────────────────────────────────────────────────────────────┤
│  Microbe 1                                                  │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐  ┌──────────────────┐  │
│  │Card│ │Card│ │Card│ │ ?? │ │ ?? │  │  Correct Answer  │  │
│  │(R) │ │(R) │ │(O) │ │    │ │    │  │  [Microbe Card]  │  │
│  └────┘ └────┘ └────┘ └────┘ └────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Microbe 2  ...                                             │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

- Each row shows all 5 clue card slots: revealed cards show their image; unopened cards show as a dark/closed card
- Rightmost card in each row = the correct microbe answer card (always shown regardless)
- `(O)` = player opened; `??` = player did not open (no auto-reveal exists)
- [Play Again] restarts a new session

---

## 8. Answer Selection Panel

### UI Requirements

- Scrollable panel of **answer cards** (up to ~100 cards for bacteria mode)
- Each card shows: cartoon PNG image + microbe name beneath
- **Must be easy to scroll and find** — design priority
- **Drag and drop** from the panel to the answer zone OR tap/click to select

### Filter Bar

Filters narrow the answer pool. Two filter sources, both queried server-side:

**Mutually exclusive (radio group):** `Microbe.gramType` enum
| Filter | Value |
|---|---|
| GRAM + | `GramType.POSITIVE` |
| GRAM − | `GramType.NEGATIVE` |
| ACID-FAST | `GramType.ACID_FAST` |

**Multi-select (chip group):** `Microbe.tags` array of `MicrobeTag` enum
| Filter | Value |
|---|---|
| ANAEROBE | `MicrobeTag.ANAEROBE` |
| AEROBE | `MicrobeTag.AEROBE` |
| FACULTATIVE | `MicrobeTag.FACULTATIVE_ANAEROBE` |
| SPORE-FORMER | `MicrobeTag.SPORE_FORMER` |
| ENCAPSULATED | `MicrobeTag.ENCAPSULATED` |
| INTRACELLULAR | `MicrobeTag.INTRACELLULAR` |
| *(more confirmed by content team)* | extend `MicrobeTag` enum |

- Tag filters are stackable (multi-select); selecting multiple = AND semantics
- Stored as `MicrobeTag[]` on `Microbe` (Postgres array with GIN index — see §9)
- Adding a new tag = enum migration only, no schema rewrite

### Microbe Properties on Cards

Cards in the answer panel are tagged with their filterable properties. These properties come from the seed CSV alongside the PNG metadata (not manually entered post-import).

---


## 10. Visual Design Direction

### 10.1 Purpose & Audience

Medical students at Faculty of Medicine Ramathibodi Hospital, Mahidol University, using the game repeatedly over a semester (5–10 min sessions). The **visual hero is the clue card** — 600 hand-drawn cartoon PNGs delivered by the content team. The UI chrome's job is to disappear and let the cards do the talking.

### 10.2 Tone

- **Focused, not childish.** Adult learners studying for an exam — not a kids' app.
- **Calm, not loud.** Repeated play means no migraine-bright colors or constant animation.
- **Editorial, not corporate.** Microbe names in italic serif (standard Latin binomial convention) — signals "scientific content" without any extra ornament.
- **Tactile.** Cards feel like physical objects: drop shadow, subtle hover rotation, satisfying flip on reveal.

### 10.3 Memorable Detail

The **card reveal flip** is the emotional core. Use a 3D `rotateY` flip (~400ms, ease-out) — not a fade, not a scale. The flip echoes a physical card game and rewards each decision. This is the one place to spend animation budget.

### 10.4 Anti-Patterns (do not ship)

- ❌ Purple-to-blue gradients (generic AI default)
- ❌ Glass morphism / frosted backdrops
- ❌ Generic "medical green" (#22c55e everywhere)
- ❌ Bright primary triad (red/yellow/blue) — too childish
- ❌ Hero gradients on Home or Leaderboard
- ❌ Heart icons in cartoon-red — keep them muted, rusty
- ❌ Cards inside cards (no nested elevated surfaces)
- ❌ "About this study" marketing copy in the UI (IRB consent lives in the pre-test Google Form)

### 10.5 Component Patterns

| Component | Direction |
|---|---|
| **Clue card** | Delivered as PNG asset — no element design needed. Render the PNG as-is at the slot's aspect ratio; label below in italic serif for microbe names. |
| **Microbe name** | Always italic serif (e.g., *Staphylococcus aureus*). Genus capitalized, species lowercase, italic. This single typographic rule conveys "scientific" without extra ornament. |
| **Hearts** | Outlined heart icon in a muted rusty red. Filled when alive, outline only when lost. No bouncing or pulsing. |
| **Score** | Monospace digits so the value doesn't jitter when it changes. |
| **Filter chips** (Answer panel) | Pill-shaped, neutral background by default; accent background + inverse text when selected. Stackable with chip count badge. |
| **Primary button** | Solid accent, white text, rounded, comfortable padding. **One per screen** — don't dilute. |
| **Disabled answer button** | Neutral background, muted text, no shadow, `cursor-not-allowed`. Tooltip: _"Reveal at least 1 clue card to answer."_ |
| **Modal (End Screen)** | Surface panel over a dimmed backdrop, fades in. Focus trap + `Esc` to close + body scroll lock. |

### 10.6 Accessibility (non-negotiable — WCAG 2.2 AA)

- **Drag-and-drop has a click-to-select fallback** for keyboard users. Click answer card → click "Submit Selected". Drag is a shortcut, not the only path.
- **All color-coded state** (hearts, GRAM+/−, correct/wrong) backed by **text or icon**, never color alone.
- **Focus ring:** 2px solid accent color, 2px offset. Visible on every interactive element.
- **Modal behavior:** focus trap, `Esc` to close, scroll-lock on body, `aria-modal="true"`, return focus to trigger on close.
- **Force-landscape on mobile:** show rotate prompt but **do not block** — render a degraded portrait layout for devices that can't rotate (mounted iPads, accessibility users).
- **Contrast ratios:** body text ≥ 4.5:1, UI controls ≥ 3:1, large text ≥ 3:1.
- **Touch targets:** ≥ 44×44 px on mobile (filter chips, card slots, answer cards).

### 10.7 Responsive Constraints

- **Card slot grid:** fixed 5-column on landscape ≥ 768px; 5-column scroll on smaller. Slot aspect ratio is fixed (e.g. 3:4) — never collapses when label text wraps.
- **Answer panel:** fixed-height scroll region (60vh) on landscape; collapsible drawer on portrait.
- **Top bar:** stable layout — heart count, round counter, score do not reflow as values change (monospace digits for score, fixed-width hearts).

### 10.8 What This Direction Excludes

- No marketing landing page. The first viewport after login is Home with **Play** as the obvious primary action.
- No achievement / badges system — out of scope, dilutes the research metric.
- No theme switcher / dark mode for v1 — single calm palette is the direction.
- No sound effects (per §14) — only the BGM loop. Card flip is silent.

---

## 11. Page & Screen Requirements

### Page 0 — Intro (Optional for v1)
- No animations required for v1
- Can show a simple splash screen with logo while assets load
- If intro animation is delivered later, play it before the login page

### Page 1 — Entry (Username)
- Two tabs or toggle: **Log In** / **Sign Up**
- Input: username (1-10 chars)
- **Log In path:** check username exists as a registered Player → Page 2 (password)
- **Sign Up path:** check username is in `ApprovedUsername` whitelist and not yet registered → Page 2 (set password)
- Error (Log In): _"Username not found."_
- Error (Sign Up, not whitelisted): _"Your username is not registered. Please complete the pre-test form first."_
- Error (Sign Up, already registered): _"An account already exists for this username. Please log in."_

### Page 2 — Password
- **Log In:** enter existing password → error: _"Incorrect password. Please try again."_
- **Sign Up:** choose a password (6+ characters) → account created
- On success → Supabase session is established → Page 3

### Page 3 — Home
- Buttons: **Play**, **How to Play**, **Leaderboard**, **Pathogen Book**, **Credits & References**
- Background music starts playing (1-min MP3 loop)

### Page 4 — Game Mode Select
- **Bacteria** — unlocked from start
- **Parasite** — unlocked after midterm date (Config-gated)
- **Fungi** — locked (future)
- **Virus** — locked (future)
- Posttest gate check runs here: if inside posttest window and player has no PostTest row → redirect to posttest before game

### Page 5 — Tutorial
- Embedded YouTube video (iframe)
- Shown automatically on first game start; accessible from Home thereafter

### Page 6 — Leaderboard
- Ranked by cumulative `totalScore` (descending)
- **Top 5 players only**
- Each row: `Rank | Username | Total Score | Games Completed`
- Equal scores → equal rank (e.g., two players at 1500 are both Rank 1; next distinct score is Rank 3)
- Time is **not** shown on leaderboard
- No real-time updates required — fetch on page load is sufficient

### Page 7 — Gameplay (React)
- **Top bar:** `[Round n/5] [♥♥♥] [Score: X]`
- **Card slots:** 5 slots — **all hidden at start**; player clicks to reveal one at a time
- Answer button is **disabled** until the player has opened at least 1 card
- **Answer panel:** scrollable, filterable, drag-and-drop (see §8)
- **No timer shown** (time tracked in background, not displayed to player)
- **Wrong answer state:** all cards flip open + correct answer shown + "Next Microbe" button

### Page 8 — Win / Game-Over Popup
- React modal overlay (see §7 for layout)
- Scrollable rows of all microbes attempted
- [Play Again] → new session

### Page 9 — Pathogen Book

#### 9.1 Overall Layout

The Pathogen Book renders as a two-page open book. **All visual chrome (background, book frame, panels, tabs, stars) is PNG — no CSS-drawn UI elements.** React components position PNG `<img>` tags and microbe data on top of these backgrounds.

```
┌──────┬───────────────────────────┬───────────────────────────┐
│      │  LEFT PAGE                │  RIGHT PAGE               │
│ tabs │  Category Title           │  Selected Microbe Detail  │
│      │  Microbe Grid             │  Characteristic Cards     │
└──────┴───────────────────────────┴───────────────────────────┘
```

- **Background:** full-screen PNG (`/assets/pathogen-book/{category}.png`) — one per category (bacteria, virus, fungi, parasite)
- **Category tabs (far-left strip):** vertical column of circular/icon PNGs, one per microbe type; clicking a tab navigates to that category's page
- The book uses `position: relative` / `absolute` to layer microbe data on top of the background PNG

#### 9.2 Left Page — Microbe Grid

Displays all microbes for the current category in a scrollable grid.

- **Title:** category name at the top of the left page (e.g. "Bacteria"), rendered as text positioned over the background PNG
- **Grid:** 4 columns, fixed
- **Each microbe entry card contains (all PNGs):**
  - Microbe cartoon image (`Microbe.answerImageUrl`)
  - Short name label beneath the image (`Microbe.shortName`)
  - Clinical Relevance star rating beneath the name — one static PNG per rating value (e.g. `stars-1.png` … `stars-5.png`); chosen by rounding `Microbe.starRating Float` to the nearest integer (1–5 max)
  - Gram-type indicator badge in the top-left corner of the card (PNG icon showing GRAM+/GRAM−/ACID-FAST)
- **Locked state:** if the microbe has not been unlocked by the player, the microbe image is replaced with a locked-state PNG (black card / "?"); the name and stars are hidden
- **Unlocked state:** full card shown as described above
- **Selection:** clicking an unlocked microbe entry updates the right page to show that microbe's detail; the selected card has a visual highlight
- A microbe is unlocked **only when the player answers it correctly** in-game

#### 9.3 Right Page — Microbe Detail

Shows the full detail for the currently selected microbe.

- **Microbe card (top section):**
  - Large microbe cartoon image (`Microbe.answerImageUrl`) in a card frame PNG
  - Full name beneath or beside the card (`Microbe.name`) in italic serif
  - "Clinical Relevance Rating" label + the same static `stars-{n}.png` as the grid card
- **Characteristic cards (bottom grid) — ⚠️ NOT YET IMPLEMENTED:**
  - Each microbe has one or more characteristic cards sourced from `public/assets/cards/clues/`
  - Card categories (each is a sub-folder under `clues/`):
    | Category | Folder | `CardCategory` enum |
    |---|---|---|
    | Gram Stain | `gram-stain/` | `GRAM_STAIN` |
    | Clinical Manifestation | `clinical-manifistation/` | `CLINICAL_MANIFESTATION` | 
    | Lab Characteristic | `lab-characteristic/` | `LAB_CHARACTERISTIC` |
    | Virulence Factor | `virulence-factor/` | `VIRULENCE_FACTOR` |
    | Special Trait | `special-trait/` | `SPECIAL_TRAIT` |
    | Transmission | `transmission/` | `TRANSMISSION` |
    | Morphology | `morphology/` | `MORPHOLOGY` |
  - Each microbe may have **zero, one, or many** cards per category (e.g. 3 Virulence Factor cards shown side-by-side)
  - Each card is a PNG (`ClueCard.imageUrl`)
  - Layout order: Gram Stain → Clinical Manifestation → Lab Characteristic → Virulence Factor → Special Trait -> Transmission -> Morphology
  - Data source: `GET /api/pathogen-book/{microbeId}/clues` → array of `{ id, category, label, imageUrl, sortOrder }`
  - **Implementation note:** The API endpoint already exists. UI display in `PathogenBookLayout.tsx` right panel is pending — see `ClueSection` component and `ClueCardEntry` type already scaffolded in that file.
- When no microbe is selected (page first load), the right page shows the book background only

#### 9.4 Navigation

- Entry point from Home (Page 3) → `/pathogen-book` → landing page with category selector (or directly to bacteria by default — TBD)
- Category sub-routes: `/pathogen-book/bacteria`, `/pathogen-book/fungi`, `/pathogen-book/parasite`, `/pathogen-book/virus`
- Tab strip on the left edge navigates between categories without a full page reload (client-side route)
- Back button / close returns to Home

#### 9.5 Data Source

- `GET /api/pathogen-book?gameMode=BACTERIA` returns all microbes + `unlocked: boolean` per player
- `ClueCard` rows for the selected microbe are fetched on selection (or eagerly with the microbe list — TBD)
- Unauthenticated users see all microbes as locked

#### 9.6 Open Questions — Pathogen Book

| # | Question |
|---|---|
| ~~PB-1~~ | ~~How many columns?~~ — **resolved: 4 columns, fixed** |
| PB-2 | Is there a separate bacteria background PNG, or is only fungi/parasite/virus provided? |
| PB-3 | Are the category tab icons already provided as PNGs, or do we create them? |
| PB-4 | What is the `clinicalRelevance` field on `Microbe`? (not in current schema — is it a 1–5 int, or derived from tags?) |
| PB-5 | Are ClueCards fetched alongside the microbe list, or on-demand when a microbe is selected? |
| PB-6 | Does the right page show all ClueCards for a microbe regardless of which ones the player revealed in-game? |
| ~~PB-7~~ | ~~Shared vs per-microbe star PNGs?~~ — **resolved: static `stars-{1..5}.png` per rating value; `Microbe.starRating` rounded to nearest int selects the image** |

### Page 10 — Posttest (In-Game)
- Full-page React component (not a modal) — player cannot skip
- **20 questions**, multiple choice, **shuffled** order every time
- Triggered when: today is within `posttest_start` and `posttest_end` dates in Config
- Player who has not submitted posttest is blocked from playing until submitted
- Submit → `POST /api/posttest` → shows score: **"You scored X / 30"** → player can play
- No pass/fail threshold — any submission (even 0/30) unlocks the game

---

## 12. Next.js API Routes (`app/api/`)

### 12.1 Auth Middleware

All authenticated routes run through `requireAuth()`:
1. Read the Supabase session from cookies
2. Load `Player` by Supabase auth UID
3. Return `401` if missing/invalid session or if the player row does not exist

Routes marked `+ owner` additionally check that the resource belongs to the authenticated `playerId` and return `403` otherwise.

### 12.2 Response Envelope

All success responses use a flat shape — the resource is the response body. HTTP status code carries success/error semantics; there is no `success: true` field. List endpoints return an array.

```jsonc
// 200 OK — single resource
{ "id": "abc", "totalScore": 1240, "gamesPlayed": 8 }

// 200 OK — list (no pagination envelope needed; leaderboard is fixed at top 5)
[{ "rank": 1, "username": "player01", "totalScore": 1500 }, …]

// 201 Created — includes Location header
HTTP/1.1 201 Created
Location: /api/sessions/sess_abc
{ "id": "sess_abc", … }

// 204 No Content — for /logout and /abandon
HTTP/1.1 204 No Content
```

### 12.3 Error Format

Every error response (4xx, 5xx) uses this shape. Never leak stack traces or SQL errors.

```jsonc
{
  "error": {
    "code": "username_not_whitelisted",
    "message": "Your username is not registered. Please complete the pre-test form first.",
    "details": [                                        // optional, for validation errors
      { "field": "username", "message": "Must be 1-10 characters", "code": "invalid_format" }
    ]
  }
}
```

| HTTP | Use |
|---|---|
| 400 | Malformed JSON, missing body |
| 401 | Missing or invalid session |
| 403 | Authenticated but not the resource owner / not admin |
| 404 | Resource does not exist |
| 409 | Conflict — e.g., card slot already revealed, account already exists |
| 422 | Validation failure (zod), out-of-range slot index |
| 500 | Unexpected server error |

### 12.4 Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | none | Body: `{ username, password }`. Validates `username` is in `ApprovedUsername` and not yet a `Player`. Creates Supabase Auth user, inserts `Player`, and starts a Supabase session. Returns `201` with `{ id, username }`. |
| POST | `/api/auth/login` | none | Body: `{ username, password }`. Signs in through Supabase Auth and starts a Supabase session. Returns `200` with `{ id, username }`. |
| POST | `/api/auth/logout` | required | Clears the Supabase session. Returns `204`. |
| GET | `/api/player/me` | required | Current player profile. |
| POST | `/api/sessions` | required | Body: `{ gameMode }`. Server picks 5 distinct microbes (one per round) and creates `SessionMicrobe` rows. Returns `201` with `{ id, gameMode, heartsLeft, currentRound, slots: [{ index: 0..4, revealed: false }, …] }`. |
| GET | `/api/sessions/:id` | required + owner | Current session state (same shape as POST response). |
| POST | `/api/sessions/:id/reveal` | required + owner | Body: `{ slotIndex: 0..4 }`. Returns `200` with `{ card: { category, label, imageUrl }, session: { cardsOpened, heartsLeft } }`. Returns `409` if slot already revealed, `422` if out of range. |
| POST | `/api/sessions/:id/answer` | required + owner | Body: `{ answeredMicrobeId }`. Returns `200` with `{ correct, correctMicrobe: { id, name, shortName, imageUrl }, roundScore, session: { heartsLeft, totalScore, completed, currentRound, currentMicrobeInRound } }`. Idempotent: second submission for the same `(round, microbeInRound)` returns `409`. |
| POST | `/api/sessions/:id/abandon` | required + owner | Mark abandoned. Returns `204`. |
| GET | `/api/leaderboard` | public | Top 5 players. No auth required — also rendered on pre-login pages. |
| GET | `/api/game-modes` | required | Lock/unlock per mode + posttest window flag: `{ bacteria: { unlocked: true }, parasite: { unlocked: false, unlocksAt: "…" }, posttestRequired: false }`. |
| GET | `/api/pathogen-book` | required | All microbes for current mode + per-player `unlocked: boolean`. |
| POST | `/api/posttest` | required | Body: `{ period, answers }`. Returns `200` with `{ score, total: 30 }`. Returns `409` if already submitted for that period. |
| PUT | `/api/admin/config/:key` | admin bearer | Body: `{ value }`. Upserts a `Config` row. Used for posttest window dates, mode unlock dates, etc. |
| GET | `/api/admin/export` | admin bearer | Query: `?format=csv` (default). CSV export of all sessions, scores, and posttests. |
| GET | `/api/admin/dashboard` | admin bearer | Aggregate stats: active players, games played, time per microbe, accuracy. |
| POST | `/api/admin/import-usernames` | admin bearer | Multipart upload of CSV with column `username`. Idempotent upsert into `ApprovedUsername`. Returns `{ imported: N, skipped: M }`. |

### 12.5 CSRF Threat Model

Supabase stores the auth session in `httpOnly`, `Secure`, `SameSite=Lax` cookies. `SameSite=Lax` blocks cross-site state-changing requests (POST/PUT/DELETE) — sufficient for this research-game threat model. No CSRF token middleware needed. **Trade-off accepted:** a malicious top-level form submission from another origin could trigger a state change, but the attack surface (mute toggle, abandon session) is not worth defending against for this audience.

---

## 13. Admin Dashboard (Optional)

Low priority — build only if time allows. Read-only stats view:

- Total active players (played at least 1 session)
- Games played (completed sessions) per day
- Time spent per microbe (average seconds across all sessions)
- Per-microbe accuracy rate
- Posttest completion count

If not built as a UI, all data is available via `GET /api/admin/export.csv`.

---

## 14. Sound

- One background music track: 1-minute MP3 loop
- Plays starting from the Home page (Page 3)
- Simple HTML5 `<audio loop>` element — no Phaser audio required
- Sound toggle button in the top bar (mute/unmute)
- Asset stored in `public/assets/audio/bgm.mp3`

---

## 15. Mobile — Force Landscape

- Force landscape orientation via CSS and/or `screen.orientation.lock('landscape')`
- Show a "Please rotate your device" overlay in portrait mode
- No need for full portrait-mode responsive design

---

## 16. Posttest Specification

- **30 questions** total, multiple choice
- Questions are **shuffled** on every posttest attempt
- Questions cover the current game period (midterm = bacteria/fungi; final = parasite/virus)
- Questions source: TBD — static in code or stored in DB (see §21 open questions)
- Player cannot access the game while posttest is active and incomplete
- After submission: show score **"You scored X / 30"** — no pass/fail threshold
- Score stored in `PostTest.score` (0–30)

### Posttest Window Timing

The posttest window locks players from playing 2–3 days before each exam, at **midnight Bangkok time (UTC+7)**.

Config stores exact ISO datetimes:
```
posttest_start_midterm = "2026-10-05T00:00:00+07:00"
posttest_end_midterm   = "2026-10-07T23:59:59+07:00"
```

**Confirmed dates:** posttest window is **5–7 October 2026** (midterm period).  
Final exam window TBD — dev updates via `PUT /api/admin/deadline` when confirmed.  
Since there are only 2 posttest windows per semester, manual updates are sufficient — no automation needed.

The API checks `now() >= posttest_start AND now() <= posttest_end` on every game-mode fetch. All datetime comparisons on the server must use the Asia/Bangkok timezone (or compare as UTC consistently).

---

## 17. Project Structure

```
germix/
├── src/
│   ├── app/
│   │   ├── page.tsx                            # Page 1: Username entry (login/signup toggle)
│   │   ├── login/
│   │   │   └── password/page.tsx               # Page 2: Password (login or set password)
│   │   ├── home/page.tsx                       # Page 3: Home
│   │   ├── game-mode/page.tsx                  # Page 4: Mode select
│   │   ├── tutorial/page.tsx                   # Page 5
│   │   ├── leaderboard/page.tsx                # Page 6
│   │   ├── play/page.tsx                       # Page 7: Gameplay
│   │   ├── pathogen-book/page.tsx              # Page 9
│   │   ├── posttest/page.tsx                   # Page 10
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   └── logout/route.ts
│   │       ├── player/me/route.ts
│   │       ├── sessions/
│   │       │   ├── route.ts                    # POST (start)
│   │       │   └── [id]/
│   │       │       ├── route.ts                # GET (state)
│   │       │       ├── reveal/route.ts         # POST (open card)
│   │       │       ├── answer/route.ts         # POST (submit answer)
│   │       │       └── abandon/route.ts        # POST
│   │       ├── leaderboard/route.ts
│   │       ├── game-modes/route.ts
│   │       ├── pathogen-book/route.ts
│   │       ├── posttest/route.ts
│   │       └── admin/
│   │           ├── deadline/route.ts
│   │           ├── export.csv/route.ts
│   │           ├── dashboard/route.ts
│   │           └── import-usernames/route.ts   # POST: upload username whitelist CSV
│   │
│   ├── components/
│   │   ├── game/
│   │   │   ├── CardSlot.tsx                    # Single clue card (revealed/hidden)
│   │   │   ├── CardGrid.tsx                    # 5 card slots for one microbe
│   │   │   ├── AnswerPanel.tsx                 # Scrollable, filterable answer cards
│   │   │   ├── FilterBar.tsx                   # GRAM+, GRAM−, ANAEROBE filters
│   │   │   ├── HeartsBar.tsx
│   │   │   ├── ScoreBar.tsx
│   │   │   └── EndScreenModal.tsx              # Win / Game-over scrollable popup
│   │   ├── posttest/
│   │   │   ├── PostTestPage.tsx
│   │   │   └── QuestionCard.tsx
│   │   ├── leaderboard/
│   │   │   └── LeaderboardTable.tsx
│   │   └── pathogen-book/
│   │       └── PathogenGrid.tsx
│   │
│   ├── lib/
│   │   ├── prisma.ts                           # singleton PrismaClient (server only)
│   │   ├── auth.ts                             # requireAuth(), signJwt(), verifyJwt()
│   │   ├── scoring.ts                          # calculateRoundScore()
│   │   └── schemas/                            # zod schemas
│   │       ├── auth.ts
│   │       ├── sessions.ts
│   │       └── posttest.ts
│   │
│   ├── types/
│   │   ├── microbe.ts
│   │   ├── game.ts
│   │   └── api.ts
│   │
│   └── middleware.ts                           # protects /home, /play, /game-mode, etc.
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                                # bulk-import microbes + clue cards from CSV
│
├── public/
│   └── assets/
│       ├── audio/
│       │   └── bgm.mp3                        # 1-min loop soundtrack
│       └── ui/                                # small UI sprites, icons, favicon
│
├── .env.local.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 18. Environment Variables

```env
# Database — Supabase
DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://...db.supabase.co:5432/postgres

# Supabase Storage (for card image URLs)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=                    # server-side only for storage admin

# Auth
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=                    # server-side only
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
ADMIN_SECRET=                                 # bearer for /api/admin/*

# Error tracking
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

---

## 19. Must Have vs. Nice to Have

### Must Have (MVP)
- [x] Username + password login (2-step)
- [x] Bacteria game mode (5 rounds × 1 microbe = 5 total)
- [x] Clue card reveal system (all 5 start hidden; player opens at cost; must open ≥1 before answering)
- [x] Answer panel with drag-and-drop + filter bar
- [x] Score formula (100 max, card-based penalty, no time factor)
- [x] 3 hearts per session; lose all → game over
- [x] Win/Game-over popup with scrollable microbe review
- [x] Leaderboard (top 5, equal rank for ties)
- [x] Posttest (30 questions, shuffled, locks game 2–3 days before exam)
- [x] Pathogen Book (found/not-found unlock system)
- [x] Background music (1-min MP3 loop with mute toggle)
- [x] Force landscape on mobile
- [x] Error messages shown inline (login errors, etc.)
- [x] Admin CSV export

### Should Have
- [ ] Parasite game mode (after midterm unlock date)
- [ ] Tutorial (auto-shown on first session)
- [ ] Admin dashboard (stats overview)
- [ ] Seed script for CSV microbe import

### Nice to Have (Future)
- [ ] Fungi + Virus game modes
- [ ] Intro animation
- [ ] Sound effects (card flip, correct/wrong)
- [ ] Embedded video tutorial

---

## 20. Card Asset Naming Convention

PNG files delivered by the content team must follow this naming convention so the seed script can parse them automatically:

```
{microbe-name-kebab-case}-{category-kebab-case}-{two-digit-index}.png
```

Examples:
```
staphylococcus-aureus-gram-stain-01.png
staphylococcus-aureus-virulence-factor-01.png
staphylococcus-aureus-virulence-factor-02.png
staphylococcus-aureus-lab-characteristic-01.png
staphylococcus-aureus-special-trait-01.png
staphylococcus-aureus-clinical-manifestation-01.png
```

Category slugs in filenames:
| CardCategory | Filename slug |
|---|---|
| GRAM_STAIN | `gram-stain` |
| VIRULENCE_FACTOR | `virulence-factor` |
| LAB_CHARACTERISTIC | `lab-characteristic` |
| SPECIAL_TRAIT | `special-trait` |
| CLINICAL_MANIFESTATION | `clinical-manifestation` |

Supabase Storage bucket layout:
```
cards/
└── bacteria/
    ├── staphylococcus-aureus-gram-stain-01.png
    ├── staphylococcus-aureus-virulence-factor-01.png
    └── ...
```

---

## 21. Open Questions

| # | Question | Owner | Due |
|---|---|---|---|
| 1 | Full filter-tag list for Answer panel (GRAM+, GRAM−, ANAEROBE — what else?) | Content team | 2026-06-15 |
| 2 | Posttest questions — 30 questions content and correct answers authored | Faculty | 2026-06-30 |
| 3 | Are posttest questions static (hardcoded) or stored in DB? | PI | 2026-06-30 |
| 4 | Card PNGs delivery format (zip? Google Drive? other?) | Content team | upon delivery |
| 5 | How many bacteria microbes total? (exact count TBD) | Content team | upon delivery |
| 6 | IRB consent text for posttest — approved before pilot | PI + IRB | before pilot |
| 7 | YouTube tutorial video URL | Stakeholder | before release |
