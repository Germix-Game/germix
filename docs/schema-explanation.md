# Germix Database Schema

**Updated:** Based on `Details for Dev.docx` (research ethics submission)

A table-by-table walkthrough of the database designed for the Germix microbiology card game.

---

## Enums

```
GameMode        → BACTERIA | FUNGI | PARASITE | VIRUS
GramType        → POSITIVE | NEGATIVE | ACID_FAST | NONE
CardCategory    → GRAM_STAIN | VIRULENCE_FACTOR | LAB_CHARACTERISTIC | SPECIAL_TRAIT | CLINICAL_MANIFESTATION
MicrobeTag      → ANAEROBE | AEROBE | FACULTATIVE_ANAEROBE | SPORE_FORMER | ENCAPSULATED | INTRACELLULAR
PostTestPeriod  → MIDTERM | FINAL
AnswerOption    → A | B | C | D
```

---

## 1. ApprovedUsername — The Whitelist

```
username (PK)          ← 1-10 chars, assigned by research team
importedAt
registeredAt (nullable)
```

**Purpose:** The list of usernames approved by Faculty of Medicine Ramathibodi to participate.

**Why it exists:** Prevents random signups. Only approved usernames from the pre-test list can create an account. Uses usernames instead of Student IDs to keep student identity confidential.

---

## 2. Player — The User Account

```
id (PK)
username (UK)                            ← 1-10 chars, leaderboard display
totalScore                               ← sum of completed gameplay scores
gamesPlayed                              ← Gameplay_count
createdAt
```

**Purpose:** The actual user account.

**How it works:**
- `username` is a display name (1-10 chars, unique) — what shows on leaderboard
- `totalScore` accumulates across completed sessions only
- `gamesPlayed` only counts completed sessions — abandoned/failed don't count

**Note:** Authentication is handled externally — no password stored in this table.

---

## 3. GameSession — One Playthrough

```
id (PK)
playerId (FK → Player)
gameMode                          (BACTERIA, FUNGI, PARASITE, VIRUS)
currentRound                      ← (1-5)
totalScore                        ← per-session score
totalTime                         ← seconds
heartsLeft                        ← starts at 3
completed                         ← counts toward Gameplay_count
abandoned
startedAt
completedAt
```

**Purpose:** Records one game session from start to finish.

**Key details:**
- `totalTime` is tracked for research/admin purposes
- `totalScore` is the sum of all round scores within this session
- Only `completed` sessions count toward `Player.gamesPlayed` and `Player.totalScore`
- `completed` and `abandoned` can never both be `true` (DB check constraint)

---

## 4. SessionMicrobe — Which Microbes Appear in Each Session

```
sessionId (PK, FK → GameSession)
roundNumber (PK)
microbeId (FK → Microbe)
```

**Purpose:** Maps which microbe appears in each round. Server picks them at session start.

**Why it exists:** Anti-cheat — clients can't change which microbes they identify.

---

## 5. Score — One Row Per Round Answered

```
id (PK)
sessionId (FK → GameSession)
playerId (FK → Player)             ← denormalized for fast CSV export
microbeId (FK → Microbe)            ← CORRECT answer
answeredMicrobeId (FK → Microbe)    ← player's guess
roundNumber
correct (boolean)
cardSlotsOpened 
heartsLeft
roundScore                          ← server-computed
timeTaken                           ← seconds
createdAt
```

**Purpose:** Records what happened in each round.

**Score formula:**
```
If wrong: 0 points
If correct: 100 - (cardsOpened - 1) × 20

Cards opened: 1 → 100 | 2 → 80 | 3 → 60 | 4 → 40 | 5 → 20
```

**Why two Microbe FKs:** Lets researchers analyze which microbes students confuse with each other.

---

## 6. Microbe — The Pathogens

```
id (PK)
name (UK)                ← "Staphylococcus aureus"
shortName                ← "S. aureus"
answerImageUrl
gameMode                 (BACTERIA, FUNGI, PARASITE, VIRUS)
gramType                 (POSITIVE, NEGATIVE, ACID_FAST, NONE)
tags                     (array of MicrobeTag)
starRating               (1-3 difficulty)
```

**Purpose:** The content — what students learn to identify.

---

## 7. ClueCard + MicrobeClue — The Hint Cards

```
ClueCard
  id (PK)
  category                 (GRAM_STAIN, VIRULENCE_FACTOR, etc.)
  label
  imageUrl

MicrobeClue (junction)
  microbeId (PK, FK → Microbe)
  clueCardId (PK, FK → ClueCard)
  sortOrder
```

**Purpose:** The clue cards students reveal during gameplay. A single card can be shared across multiple microbes (e.g., a gram stain image that applies to several bacteria).

**Why a junction table:** Avoids duplicating card data when the same clue applies to multiple microbes. Editing one card updates it everywhere.

---

## 8. PlayerMicrobeUnlocked — Pathogen Book Progress

```
playerId (PK, FK → Player)
microbeId (PK, FK → Microbe)
cardSlotsOpened (json)       ← which clue cards were revealed on the winning round
firstUnlockedAt
```

**Purpose:** Tracks which microbes each player has correctly identified and which clues they used.

**How:** Only created on correct answer. `cardSlotsOpened` is copied from the winning `Score` row so the Pathogen Book can show which clue cards the student revealed to identify this microbe.

---

## 9. PostTest — In-Game Post-Test Submission

```
id (PK)
playerId (FK → Player)
period                    (MIDTERM, FINAL)
answers (AnswerOption[])   ← player's selected answers (A, B, C, D)
score                     ← number of correct answers
submittedAt
```

**Purpose:** Records a player's post-test submission. The 30-question post-test is triggered in-game by date proximity to midterm/final exams.

**Key details:**
- Each player can submit once per period (unique constraint on `playerId` + `period`)
- `answers` stores the player's selected options as an array of `AnswerOption` (e.g., `[A, C, B, D, ...]`)
- This is separate from the external pre/post assessment collected via Google Forms by the doctors

---

## 10. PostTestQuestion — The Post-Test Question Bank

```
id (PK)
period                    (MIDTERM, FINAL)
body                      ← question text
options (String[])        ← answer choice texts
correctOption             (A, B, C, D)
sortOrder
```

**Purpose:** Stores the post-test questions and their correct answers, organized by exam period.

---

## 11. Config — Admin Settings

```
key (PK)
value
```

**Purpose:** Key-value store for game mode unlock dates and admin settings.

**Keys:**
- `parasite_unlock`, `fungi_unlock`, `virus_unlock`

---

## Relationship Map

```
ApprovedUsername                             (standalone whitelist)
Player ──→ GameSession                      (1:many)
Player ──→ Score                            (1:many, denormalized)
Player ──→ PlayerMicrobeUnlocked            (1:many)
Player ──→ PostTest                         (1:2, one per period)
GameSession ──→ SessionMicrobe              (1:5)
GameSession ──→ Score                       (1:many)
Microbe ──→ ClueCard                        (many:many, via MicrobeClue)
Microbe ──→ SessionMicrobe                  (1:many)
Microbe ──→ Score                           (1:many, TWICE — correct & answered)
Microbe ──→ PlayerMicrobeUnlocked           (1:many)
```

---

## Variable Mapping (Doctors → DB)

| Doctor's Variable | Maps to |
|---|---|
| `Student_ID` | Mapped externally (not stored in game DB for confidentiality) |
| `Username` | `Player.username` / `ApprovedUsername.username` |
| `Gameplay_count` | `Player.gamesPlayed` |
| `Gameplay_time` | `GameSession.totalTime` |
| `Gameplay_score` | `GameSession.totalScore` |
| `Total_score` | `Player.totalScore` |


## In One Sentence

> The schema captures **identity** (username), **gameplay** (sessions with scoring), **content** (microbes + shared clue cards), **progress** (Pathogen Book), **in-game assessment** (post-tests by exam period), and **configuration** (admin settings) — external pre/post knowledge assessments and satisfaction ratings are handled via Google Forms by the doctors.
