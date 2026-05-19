# Germix Database Schema — Updated for Doctors' Data Dictionary

**Updated:** Based on `Details for Dev.docx` (research ethics submission)

A table-by-table walkthrough of the database designed to capture all variables the doctors want to collect for the research study.

---

## Enums

```
GameMode        → BACTERIA | FUNGI | PARASITE | VIRUS
ExamPeriod      → MIDTERM | FINAL
TestPhase       → PRE | POST
MicrobeSection  → BACTERIA | FUNGI | PARASITE | VIRUS
GramType        → POSITIVE | NEGATIVE | ACID_FAST | NONE
CardCategory    → GRAM_STAIN | VIRULENCE_FACTOR | LAB_CHARACTERISTIC | SPECIAL_TRAIT | CLINICAL_MANIFESTATION
MicrobeTag      → ANAEROBE | AEROBE | FACULTATIVE_ANAEROBE | SPORE_FORMER | ENCAPSULATED | INTRACELLULAR
AnswerOption    → A | B | C | D
Satisfaction    → VERY_DISSATISFIED | DISSATISFIED | NEUTRAL | SATISFIED | VERY_SATISFIED
```

---

## 1. ApprovedStudentId — The Whitelist

```
studentId (PK)        ← Numeric, unique per Faculty system
importedAt
registeredAt (nullable)
```

**Purpose:** The list of students approved by Faculty of Medicine Ramathibodi to participate.

**Why it exists:** Prevents random signups. Only approved students from the pre-test list can create an account.

---

## 2. Player — The User Account

```
studentId (PK, FK → ApprovedStudentId)   ← identity from Faculty
username (UK)                            ← 1-10 chars, leaderboard display
passwordHash                             ← 1-10 chars, bcrypt'd
totalScore                               ← sum of completed gameplay scores
gamesPlayed                              ← Gameplay_count
createdAt
```

**Purpose:** The actual user account.

**How it works:**
- `studentId` is the unique identity (Numeric per Faculty)
- `username` is a separate display name (1-10 chars) — what shows on leaderboard
- *"One username is allowed per one student ID"*
- `passwordHash` stores bcrypt-hashed password (1-10 chars input)
- `totalScore` shown on leaderboard

---

## 3. GameSession — One Playthrough

```
id (PK)
studentId (FK → Player)
gameMode                          (BACTERIA, FUNGI, PARASITE, VIRUS)
currentRound
gameplayScore                     ← per-session score, calculated by accuracy AND time
gameplayTime                      ← seconds, DISPLAYED on leaderboard
heartsLeft
completed                         ← counts toward Gameplay_count
abandoned
startedAt
completedAt
```

**Purpose:** Records one game session from start to finish.

**Important changes from old spec:**
- `gameplayTime` is now **shown on the leaderboard** (was hidden before)
- `gameplayScore` is calculated using **accuracy AND time** (old spec said time didn't affect score)
- Only `completed` sessions count toward `Player.gamesPlayed`

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
studentId (FK → Player)             ← denormalized for fast CSV export
microbeId (FK → Microbe)            ← CORRECT answer
answeredMicrobeId (FK → Microbe)    ← player's guess
roundNumber
correct (boolean)
cardSlotsOpened (json)
roundScore                          ← contributes to gameplayScore
timeTaken                           ← seconds, contributes to gameplayScore
createdAt
```

**Purpose:** Records what happened in each round.

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

## 7. ClueCard — The Hint Cards

```
id (PK)
microbeId (FK → Microbe)
category                 (GRAM_STAIN, VIRULENCE_FACTOR, etc.)
label
imageUrl
```

**Purpose:** The 5 clue cards per microbe.

---

## 8. PlayerMicrobeUnlocked — Pathogen Book Progress

```
studentId (PK, FK → Player)
microbeId (PK, FK → Microbe)
firstUnlockedAt
```

**Purpose:** Tracks which microbes each player has correctly identified.

**How:** Only created on correct answer. Drives the Pathogen Book unlock state.

---

## 9. Assessment — Pre/Post Test Submissions (NEW STRUCTURE)

This **replaces the old PostTest table**. Doctors now want 4 separate tests per student.

```
id (PK)
studentId (FK → Player)
examPeriod                          (MIDTERM | FINAL)
phase                               (PRE | POST)
section                             (BACTERIA | FUNGI | PARASITE | VIRUS)
score                               (0-8)
satisfaction                        (Satisfaction enum, 1-5 Likert)
submittedAt

@@unique([studentId, examPeriod, phase, section])
```

**Purpose:** Stores the 8-question test score AND the satisfaction rating for each test event.

### Structure Per Student

```
Midterm Period
├── PRE  (at enrollment)
│   ├── Bacteria   → score (0-8) + satisfaction (1-5)
│   └── Fungi      → score (0-8) + satisfaction (1-5)
└── POST (1 week before midterm exam)
    ├── Bacteria   → score (0-8) + satisfaction (1-5)
    └── Fungi      → score (0-8) + satisfaction (1-5)

Final Period
├── PRE  (after midterm exam)
│   ├── Parasite   → score (0-8) + satisfaction (1-5)
│   └── Virus      → score (0-8) + satisfaction (1-5)
└── POST (1 week before final exam)
    ├── Parasite   → score (0-8) + satisfaction (1-5)
    └── Virus      → score (0-8) + satisfaction (1-5)
```

**Total per student:** Up to 8 Assessment rows = 8 scores + 8 satisfaction ratings.

The `@@unique([studentId, examPeriod, phase, section])` ensures one submission per (student, period, phase, section) combo.

---

## 10. AssessmentQuestion — The Question Bank

```
id (PK)
examPeriod              (MIDTERM | FINAL)
phase                   (PRE | POST)
section                 (BACTERIA | FUNGI | PARASITE | VIRUS)
body                    ← question text
options                 (json: { A, B, C, D })
correctOption           (AnswerOption: A | B | C | D)
sortOrder
```

**Purpose:** Pool of 8 questions per (examPeriod, phase, section) combination.

**Total questions:** 4 events × 2 sections × 8 questions = **64 questions** in the bank.

---

## 11. AssessmentAnswer — Individual Question Responses (Optional but Recommended)

```
id (PK)
assessmentId (FK → Assessment)
questionId (FK → AssessmentQuestion)
answer (AnswerOption)
```

**Purpose:** Stores each individual answer with referential integrity (instead of a JSON blob).

**Why:** For research data, you want every answer queryable. JSON blobs can have malformed data silently.

---

## 12. Config — Admin Settings

```
key (PK)
value
```

**Purpose:** Key-value store for assessment window dates and game mode unlock dates.

**Keys:**
- `midterm_pre_start`, `midterm_pre_end`
- `midterm_post_start`, `midterm_post_end`
- `final_pre_start`, `final_pre_end`
- `final_post_start`, `final_post_end`
- `parasite_unlock`, `fungi_unlock`, `virus_unlock`

---

## Relationship Map

```
ApprovedStudentId ──→ Player                    (1:1)
Player ──→ GameSession                          (1:many)
Player ──→ Score                                (1:many, denormalized)
Player ──→ Assessment                           (1:up to 8)
Player ──→ PlayerMicrobeUnlocked                (1:many)
GameSession ──→ SessionMicrobe                  (1:5)
GameSession ──→ Score                           (1:many)
Microbe ──→ ClueCard                            (1:5)
Microbe ──→ SessionMicrobe                      (1:many)
Microbe ──→ Score                               (1:many, TWICE — correct & answered)
Microbe ──→ PlayerMicrobeUnlocked               (1:many)
Assessment ──→ AssessmentAnswer                 (1:8)
AssessmentQuestion ──→ AssessmentAnswer         (1:many)
```

---

## Variable Mapping (Doctors → DB)

| Doctor's Variable | Maps to |
|---|---|
| `Student_ID` | `Player.studentId` |
| `Username` | `Player.username` |
| `Password` | `Player.passwordHash` |
| `Gameplay_count` | `Player.gamesPlayed` |
| `Gameplay_time` | `GameSession.gameplayTime` |
| `Gameplay_score` | `GameSession.gameplayScore` |
| `Total_score` | `Player.totalScore` |
| `Midterm_Pre_Bact_score` | `Assessment` where (MIDTERM, PRE, BACTERIA) → `score` |
| `Midterm_Pre_Bact_satisfaction` | Same row → `satisfaction` |
| `Midterm_Pre_Fungi_score` | `Assessment` where (MIDTERM, PRE, FUNGI) → `score` |
| `Midterm_Post_Bact_score` | `Assessment` where (MIDTERM, POST, BACTERIA) → `score` |
| `Midterm_Post_Fungi_score` | `Assessment` where (MIDTERM, POST, FUNGI) → `score` |
| `Final_Pre_Parasite_score` | `Assessment` where (FINAL, PRE, PARASITE) → `score` |
| `Final_Pre_Virus_score` | `Assessment` where (FINAL, PRE, VIRUS) → `score` |
| `Final_Post_Parasite_score` | `Assessment` where (FINAL, POST, PARASITE) → `score` |
| `Final_Post_Virus_score` | `Assessment` where (FINAL, POST, VIRUS) → `score` |
| All `*_satisfaction` variables | Same Assessment rows → `satisfaction` |

---

## Conflicts With Old Spec — Resolved in This Version

| Topic | Old Spec | This Schema (Doctors) |
|---|---|---|
| **Identity** | `username` only | `studentId` + `username` + `password` |
| **Score formula** | Card-based only | Accuracy + Time |
| **Leaderboard time** | Hidden | Shown |
| **Test structure** | One 20-Q posttest | 4 events × 2 sections × 8 Qs |
| **Pretest** | Google Form only | In-game pretest |
| **Satisfaction** | Not tracked | Required per section per test |

---

## In One Sentence

> The schema captures **identity** (studentId/username/password), **gameplay** (sessions with time + accuracy scoring), **content** (microbes + clue cards), **progress** (Pathogen Book), and **research outcomes** (4 pre/post assessments with satisfaction ratings) — fully aligned with the doctors' data dictionary.
