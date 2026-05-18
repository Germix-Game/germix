# Germix — Project Requirements Document

**Version:** 0.9  
**Last Updated:** 2026-05-18  
**Status:** Draft — schema and API hardened after design review. Visual design direction added. Signup endpoint, response envelope, error format, and reveal/answer contracts now explicit.

---

## 0. Change Log

| Version | Date | Summary |
|---|---|---|
| 0.9 | 2026-05-18 | **Applied all 0.8 schema changes that were logged but never written to the schema:** `enum AnswerOption { A B C D }` added; `Microbe.answerImageUrl String` added; `Score.microbeId`/`answeredMicrobeId` now proper named `@relation` to `Microbe` (`"CorrectMicrobe"` / `"AnsweredMicrobe"`); `Score.gameMode` removed; `ClueCard.imageUrl` non-nullable; `PostTest.score Int @default(0)` non-nullable; `PostTestQuestion.correctOption AnswerOption`; `ApprovedStudentId` gains `registeredAt DateTime?` + 1-to-1 `Player?` back-relation; `Player` gains `approved ApprovedStudentId` FK (DB-enforces every player was whitelisted). **Over-engineering fixed:** `SessionMicrobe` and `PlayerMicrobeUnlocked` surrogate PKs removed — now use composite `@@id` (natural key). **Index added:** `Score.@@index([microbeId])` for admin per-microbe accuracy queries. |
| 0.8 | 2026-05-18 | **Schema best-practice fixes (logged only — not applied until 0.9):** added `enum AnswerOption { A B C D }` for type-safe posttest answers; `Microbe.answerImageUrl String` added (required for Answer panel, End Screen, Pathogen Book); `Score.microbeId`/`answeredMicrobeId` now proper `@relation` to `Microbe` (was bare String — no referential integrity); `Score.gameMode` removed (redundant, derivable via session join); `ClueCard.imageUrl` is now non-nullable `String` (all cards are PNGs); `PostTest.score` is now non-nullable `Int @default(0)`; `PostTestQuestion.correctOption` now typed as `AnswerOption`; `ApprovedStudentId` gains `registeredAt DateTime?` and a 1-to-1 relation to `Player` (enforces that every registered player was whitelisted at DB level). |
| 0.7 | 2026-05-18 | **Session structure changed:** 5 rounds × 1 microbe = 5 total identifications to win (was 5 × 3 = 15). `MICROBES_PER_ROUND` is now 1. Max session score is now 500. All references updated. **Schema fixes:** `PlayerMicrobeSeen` renamed to `PlayerMicrobeUnlocked` (semantic clarity); `Json microbeIds` replaced with `SessionMicrobe` relation model (enforces no-duplicate microbes via DB constraint); `Score.microbeInRound` removed (always 1, redundant); `GameSession.currentMicrobeInRound` removed (same reason); `PostTestQuestion` model added so `/api/posttest` can compute scores server-side. |
| 0.6 | 2026-05-17 | **Schema fixes:** removed redundant `Score.cardsOpened` (derive from `cardSlotsOpened.length`); replaced ad-hoc `Microbe.isAnaerobe` boolean with extensible `tags MicrobeTag[]`; `PostTest.period` is now a `PostTestPeriod` enum; clarified `GameSession.currentRound`/`currentMicrobeInRound` exist for server-side anti-cheat sequencing (not client resume). **API fixes:** added `POST /api/auth/signup` (was a spec hole vs §4.1); added §11 preamble defining response envelope and error format; specified `/reveal` and `/answer` request and response bodies; generalized `PUT /api/admin/deadline` to `PUT /api/admin/config/:key`; `/api/leaderboard` is now explicitly public. **New §10 Visual Design Direction:** tokens, type, color, motion, accessibility constraints. |
| 0.5 | 2026-05-17 | Wrong-answer flow finalized (reveal all cards + correct answer → Next button). No auto-reveal — all 5 cards start hidden, player opens manually. Account creation: self-registration with Student_ID whitelist (CSV import). Leaderboard: masked Student_ID. Posttest: show score (X/30), no pass/fail gate. Pathogen Book: unlocks on correct answer only. Tutorial: YouTube embed. Session structure noted as scalable (5×N). PNG naming convention confirmed. |
| 0.4 | 2026-05-17 | **Phaser.js removed — pure React/Next.js.** Google Sheets removed — Supabase only, CSV export. Login field changed to Student_ID (format 66XXXXXXX). Score formula finalized (100 max, card-based penalty only, no time factor). Session structure changed to 5 rounds × 3 microbes = 15 total. Leaderboard changed to top 5, equal rank for ties. Posttest changed to 30-question in-game web form, shuffled, locks game 2–3 days before exam. Card count changed to 600 (from 900). Focus on bacteria first. Admin dashboard marked optional. Sound: 1 min MP3 loop. Mobile: force landscape. No animations for v1. |
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
| Auth | Custom JWT + bcrypt | `jose` for signing, `bcryptjs` for hashing |
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

### ADR-1: Custom JWT + bcrypt, not Supabase Auth
- **Context:** Login uses Student_ID (format: `66XXXXXXX`) and a short password. Supabase Auth requires email and enforces password minimums.
- **Decision:** `/api/auth/login` validates `Player.passwordHash` (bcrypt) and issues a signed JWT (HS256, `JWT_SECRET` env var) stored in an `httpOnly`, `Secure`, `SameSite=Lax` cookie. JWT carries `{ playerId, studentId, iat, exp }`. Validated via `requireAuth()` on every protected route.

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

Students self-register inside the game. Only Student IDs that appear on the approved whitelist (imported from Google Form responses) are accepted.

```
Research team exports approved Student IDs from Google Form
  → Dev (or admin endpoint) imports CSV → creates ApprovedStudentId whitelist rows
  → Student opens game → clicks "Sign Up"
  → Enters Student ID → server checks ApprovedStudentId table
      If not in whitelist → error: "Your Student ID is not registered.
                                    Please complete the pre-test form first."
      If already registered → error: "Account already exists. Please log in."
      If approved + new → student sets a password (5–20 chars)
  → Player row created → JWT cookie set → Home page
```

### 4.2 Login Flow (Returning Player)

1. **Page 1 — Student ID**
   - Input: Student ID in format `66XXXXXXX`
   - Error if not found: _"Student ID not found."_
   - On valid ID → Page 2

2. **Page 2 — Password**
   - Input: password (5–20 characters)
   - `POST /api/auth/login` → bcrypt compare → JWT cookie
   - On success → Page 3 (Home)
   - Error if wrong: _"Incorrect password. Please try again."_

### 4.3 Whitelist Import

Admin uploads a CSV of approved Student IDs via `POST /api/admin/import-students`. The CSV has one column: `student_id`. Duplicate imports are idempotent (upsert). This is the only way to add valid Student IDs — the game itself does not validate against Google Form directly.

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

## 9. Prisma Schema

```prisma
// prisma/schema.prisma

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")        // Supabase pooler (pgbouncer)
  directUrl = env("DIRECT_URL")          // direct connection for prisma migrate
}

generator client {
  provider = "prisma-client-js"
}

enum GameMode {
  BACTERIA
  FUNGI
  VIRUS
  PARASITE
}

enum CardCategory {
  GRAM_STAIN
  VIRULENCE_FACTOR
  LAB_CHARACTERISTIC
  SPECIAL_TRAIT
  CLINICAL_MANIFESTATION
}

enum GramType {
  POSITIVE
  NEGATIVE
  ACID_FAST
  NONE
}

// Filter tags for the Answer panel (multi-select stackable filters).
// Extend this enum as the content team confirms additional taxonomy filters.
enum MicrobeTag {
  ANAEROBE
  AEROBE
  FACULTATIVE_ANAEROBE
  SPORE_FORMER
  ENCAPSULATED
  INTRACELLULAR
  // …more as confirmed (see §21 open questions)
}

enum PostTestPeriod {
  MIDTERM
  FINAL
}

enum AnswerOption {
  A
  B
  C
  D
}

model Player {
  id               String                  @id @default(cuid())
  studentId        String                  @unique               // e.g. "6612345678" — login field
  passwordHash     String                                        // bcrypt
  totalScore       Int                     @default(0)
  gamesPlayed      Int                     @default(0)           // completed sessions only
  createdAt        DateTime                @default(now())
  approved         ApprovedStudentId       @relation(fields: [studentId], references: [studentId])
  sessions         GameSession[]
  scores           Score[]
  postTests        PostTest[]
  microbesUnlocked PlayerMicrobeUnlocked[]

  @@index([totalScore(sort: Desc)])                             // leaderboard query
}

model GameSession {
  id           String    @id @default(cuid())
  player       Player    @relation(fields: [playerId], references: [id])
  playerId     String
  gameMode     GameMode
  microbes     SessionMicrobe[]                            // 5 rows, one per round (ADR-2)
  // Server-side progress cursor — used to validate that `/reveal` and `/answer`
  // requests target the correct round in sequence (anti-cheat per ADR-2).
  // NOT for client resume — §6.2 forbids cross-tab persistence.
  currentRound Int       @default(1)                       // 1..5
  totalScore   Int       @default(0)
  totalTime    Int       @default(0)                       // seconds (admin tracking only)
  heartsLeft   Int       @default(3)
  completed    Boolean   @default(false)                   // true = all 5 microbes done
  abandoned    Boolean   @default(false)                   // heart-out or drop-off; mutually exclusive with completed
  // DB check constraint (add via raw SQL migration — Prisma has no @@check support):
  // ALTER TABLE "GameSession" ADD CONSTRAINT chk_not_both_completed_abandoned
  //   CHECK (NOT (completed = true AND abandoned = true));
  startedAt    DateTime  @default(now())
  completedAt  DateTime?
  scores       Score[]

  @@index([playerId, startedAt(sort: Desc)])
  @@index([completed, completedAt])
}

model Score {
  id                String      @id @default(cuid())
  session           GameSession @relation(fields: [sessionId], references: [id])
  sessionId         String
  player            Player      @relation(fields: [playerId], references: [id])
  playerId          String                                 // denormalized from session — avoids join on admin CSV export
  roundNumber       Int                                    // 1..5
  microbe           Microbe     @relation("CorrectMicrobe",  fields: [microbeId],         references: [id])
  microbeId         String
  answeredMicrobe   Microbe?    @relation("AnsweredMicrobe", fields: [answeredMicrobeId],  references: [id])
  answeredMicrobeId String?                                // null if player abandoned mid-round
  correct           Boolean     @default(false)
  cardSlotsOpened   Json                                   // slot indices player revealed, e.g. [0,2]; cardsOpened = length
  heartsLeft        Int
  roundScore        Int                                    // server-computed
  timeTaken         Int                                    // seconds (admin only)
  createdAt         DateTime    @default(now())

  @@unique([sessionId, roundNumber])
  @@index([playerId, createdAt(sort: Desc)])
  @@index([microbeId])                                     // admin per-microbe accuracy queries
}

model Microbe {
  id               String                @id @default(cuid())
  name             String                @unique                  // full Latin binomial, e.g. "Staphylococcus aureus"
  shortName        String                                         // display short form, e.g. "S. aureus"
  answerImageUrl   String                                         // Supabase Storage CDN URL — Answer panel, End Screen, Pathogen Book
  gameMode         GameMode
  gramType         GramType              @default(NONE)
  tags             MicrobeTag[]                                   // Postgres native array; GIN-indexed below
  starRating       Int                   @default(1)              // 1–3 difficulty (see §21 open question #6)
  clueCards        ClueCard[]
  playersUnlocked  PlayerMicrobeUnlocked[]
  sessions         SessionMicrobe[]
  correctInScores  Score[]               @relation("CorrectMicrobe")
  answeredInScores Score[]               @relation("AnsweredMicrobe")

  @@index([gameMode])
  @@index([tags], type: Gin)
}

model ClueCard {
  id        String       @id @default(cuid())
  microbe   Microbe      @relation(fields: [microbeId], references: [id])
  microbeId String
  category  CardCategory
  label     String
  imageUrl  String                                        // Supabase Storage CDN URL
  sortOrder Int          @default(0)

  @@index([microbeId, category])
}

// Rows created ONLY on correct answer — wrong-answer encounters do NOT create a row.
// Drives Pathogen Book unlock state; intentionally not a general "seen" log.
model PlayerMicrobeUnlocked {
  player          Player   @relation(fields: [playerId], references: [id])
  playerId        String
  microbe         Microbe  @relation(fields: [microbeId], references: [id])
  microbeId       String
  firstUnlockedAt DateTime @default(now())

  @@id([playerId, microbeId])          // composite PK; Postgres indexes playerId as leading column — no extra index needed
}

// One row per round in a session. Replaces the old Json microbeIds field.
// @@unique([sessionId, microbeId]) enforces no duplicate microbes within a session.
model SessionMicrobe {
  session     GameSession @relation(fields: [sessionId], references: [id])
  sessionId   String
  microbe     Microbe     @relation(fields: [microbeId], references: [id])
  microbeId   String
  roundNumber Int         // 1..5

  @@id([sessionId, roundNumber])       // composite PK; Postgres indexes sessionId as leading column — no extra index needed
  @@unique([sessionId, microbeId])     // no duplicate microbes in a session
}

// Rows created by admin CSV import only — no game-side creation.
// player back-relation enforces DB-level FK: every Player.studentId must exist here.
model ApprovedStudentId {
  studentId    String    @id               // e.g. "6612345678"
  importedAt   DateTime  @default(now())
  registeredAt DateTime?                   // set at Player creation; null = not yet signed up
  player       Player?
}

model PostTest {
  id          String         @id @default(cuid())
  player      Player         @relation(fields: [playerId], references: [id])
  playerId    String
  period      PostTestPeriod                                // MIDTERM | FINAL
  answers     Json                                          // { [PostTestQuestion.id]: AnswerOption }
  score       Int            @default(0)                   // 0–30; always set at submission
  submittedAt DateTime       @default(now())

  @@unique([playerId, period])          // one submission per player per period; unique constraint IS the index — no @@index needed
}

model PostTestQuestion {
  id            String         @id @default(cuid())
  period        PostTestPeriod                             // MIDTERM | FINAL
  body          String                                     // question text
  options       Json           // { A: "...", B: "...", C: "...", D: "..." }
  correctOption AnswerOption                               // DB-enforced; not a raw string
  sortOrder     Int            @default(0)                 // base order before shuffle

  @@index([period])
}

model Config {
  key   String @id
  value String
  // Keys: "posttest_start_midterm", "posttest_end_midterm",
  //       "posttest_start_final", "posttest_end_final",
  //       "parasite_unlock", "fungi_unlock", "virus_unlock"
}
```

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

### Page 1 — Entry (Student ID)
- Two tabs or toggle: **Log In** / **Sign Up**
- Input: Student ID (format `66XXXXXXX`)
- **Log In path:** check Student ID exists as a registered Player → Page 2 (password)
- **Sign Up path:** check Student ID is in `ApprovedStudentId` whitelist and not yet registered → Page 2 (set password)
- Error (Log In): _"Student ID not found."_
- Error (Sign Up, not whitelisted): _"Your Student ID is not registered. Please complete the pre-test form first."_
- Error (Sign Up, already registered): _"An account already exists for this Student ID. Please log in."_

### Page 2 — Password
- **Log In:** enter existing password → error: _"Incorrect password. Please try again."_
- **Sign Up:** choose a password (5–20 characters) → account created
- On success → server sets JWT cookie → Page 3

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
- Each row: `Rank | Student ID (masked, e.g. 66*****78) | Total Score | Games Completed`
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
- Grid of all microbes in the current game mode
- **Unlocked:** show microbe cartoon image + name (full card)
- **Locked:** black card with "?" — name hidden
- A microbe is unlocked **only when the player answers it correctly** — encountering it (opening cards) without a correct answer does not unlock it
- Recorded in `PlayerMicrobeSeen` when the server confirms a correct answer

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
1. Verify JWT cookie with `JWT_SECRET`
2. Load `Player` by `playerId`
3. Return `401` if invalid/expired

Routes marked `+ owner` additionally check that the resource belongs to the authenticated `playerId` and return `403` otherwise.

### 12.2 Response Envelope

All success responses use a flat shape — the resource is the response body. HTTP status code carries success/error semantics; there is no `success: true` field. List endpoints return an array.

```jsonc
// 200 OK — single resource
{ "id": "abc", "totalScore": 1240, "gamesPlayed": 8 }

// 200 OK — list (no pagination envelope needed; leaderboard is fixed at top 5)
[{ "rank": 1, "studentId": "66*****78", "totalScore": 1500 }, …]

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
    "code": "student_id_not_whitelisted",
    "message": "Your Student ID is not registered. Please complete the pre-test form first.",
    "details": [                                        // optional, for validation errors
      { "field": "studentId", "message": "Must match format 66XXXXXXX", "code": "invalid_format" }
    ]
  }
}
```

| HTTP | Use |
|---|---|
| 400 | Malformed JSON, missing body |
| 401 | Missing or invalid JWT |
| 403 | Authenticated but not the resource owner / not admin |
| 404 | Resource does not exist |
| 409 | Conflict — e.g., card slot already revealed, account already exists |
| 422 | Validation failure (zod), out-of-range slot index |
| 500 | Unexpected server error |

### 12.4 Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | none | Body: `{ studentId, password }`. Validates `studentId` is in `ApprovedStudentId` and not yet a `Player`. bcrypt-hash password → create `Player` → set JWT cookie. Returns `201` with `{ id, studentId }`. |
| POST | `/api/auth/login` | none | Body: `{ studentId, password }`. bcrypt-compare → set JWT cookie. Returns `200` with `{ id, studentId }`. |
| POST | `/api/auth/logout` | required | Clear cookie. Returns `204`. |
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
| POST | `/api/admin/import-students` | admin bearer | Multipart upload of CSV with column `student_id`. Idempotent upsert into `ApprovedStudentId`. Returns `{ imported: N, skipped: M }`. |

### 12.5 CSRF Threat Model

JWT is stored in an `httpOnly`, `Secure`, `SameSite=Lax` cookie. `SameSite=Lax` blocks cross-site state-changing requests (POST/PUT/DELETE) — sufficient for this research-game threat model. No CSRF token middleware needed. **Trade-off accepted:** a malicious top-level form submission from another origin could trigger a state change, but the attack surface (mute toggle, abandon session) is not worth defending against for this audience.

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
│   │   ├── page.tsx                            # Page 1: Student ID entry (login/signup toggle)
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
│   │           └── import-students/route.ts    # POST: upload Student_ID whitelist CSV
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
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=                    # server-side only for storage admin

# Auth
JWT_SECRET=                                   # 32+ random bytes; rotate quarterly
ADMIN_SECRET=                                 # bearer for /api/admin/*

# Error tracking
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

---

## 19. Must Have vs. Nice to Have

### Must Have (MVP)
- [x] Student_ID + password login (2-step)
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
