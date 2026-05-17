# Germix — Missing Requirements Before Build

**Reviewed against:** CLAUDE.md, bacteria_parasite_game_requirements.md v0.4  
**Last Updated:** 2026-05-17  
**Status:** Updated after stakeholder meeting 2026-05-17. Many CRITICAL items resolved.

---

## Priority Legend
- **CRITICAL** — Blocks implementation. Cannot build without this.
- **HIGH** — Will cause rework if not resolved before that feature is built.
- **MEDIUM** — Can start without it but must resolve before release.
- **RESOLVED** — Decision made; documented in requirements doc v0.4.

---

## RESOLVED Items (from 2026-05-17 stakeholder meetings)

| # | Item | Resolution |
|---|---|---|
| R1 | Login flow | Student_ID (format `66XXXXXXX`) + password. 2-step entry. |
| R2 | Score formula | 100 max per microbe. Open 1=100, 2=80, 3=60, 4=40, 5=20, wrong=0. |
| R3 | Time in scoring | Time tracked for admin only. Does not affect score or leaderboard. |
| R4 | REDCap | Removed entirely. Supabase Postgres + CSV export only. |
| R5 | Phaser.js | Removed entirely. Pure React + Next.js + Tailwind CSS. |
| R6 | Session recovery | No save on tab close. Starts fresh every time. |
| R7 | Session structure | 5 rounds × 3 microbes = 15 total. 3 hearts shared across all 15. |
| R8 | Leaderboard | Top 5 only. Equal score = equal rank. Masked Student_ID (e.g. `66*****78`). No time column. |
| R9 | Posttest | 30 questions, shuffled, in-game. Shows score (X/30). Any submission unlocks game. |
| R10 | Pretest | Google Form only — not part of the game. |
| R11 | Card storage | 600 cards in Supabase Storage. `public/assets/` for BGM + small UI only. |
| R12 | Admin dashboard | Optional — not MVP. CSV export covers the need. |
| R13 | Sound | 1-min MP3 loop BGM. HTML5 audio with mute toggle. |
| R14 | Mobile | Force landscape. Portrait = "rotate device" overlay. |
| R15 | Gameplay time display | Not shown to player. Background tracking only. |
| R16 | Error messages | Shown inline on login (wrong ID, wrong password, not whitelisted, etc.). |
| R17 | Pathogen Book unlock trigger | **Correct answer only** — opening cards without answering correctly does NOT unlock. |
| R18 | Animations | None for v1. Simple splash screen only. |
| R19 | Card count | 600 cards. Focus on bacteria first. CSV content coming later. |
| R20 | Win/lose screen | Scrollable rows (5 clue cards + 1 answer card per microbe). Wrong-answer rows show all revealed. |
| R21 | Wrong answer behavior | −1 heart → reveal all 5 cards + correct answer → "Next" button. No retry on same microbe. |
| R22 | Account creation | Self-registration with Student_ID whitelist. Admin imports CSV of approved IDs. Students sign up in-game using their approved Student_ID. |
| R23 | Auto-reveal | **No auto-reveal.** All 5 cards start hidden. Player must open at least 1 card manually before answering. |
| R24 | Posttest pass/fail | No threshold. Show "You scored X / 30". Any submission unlocks game. |
| R25 | Posttest window timing | Stored as exact ISO datetimes in Config. Dev updates manually via admin API. Locks at midnight Bangkok time. |
| R26 | Session scalability | Constant `MICROBES_PER_ROUND = 3`. Easy to change to 4 in future without schema migration. |
| R27 | PNG naming convention | `{microbe-kebab}-{category-slug}-{nn}.png` e.g. `staphylococcus-aureus-gram-stain-01.png`. |
| R28 | Tutorial format | YouTube video embed (iframe). |

---

## 1. CRITICAL — Posttest Questions Not Authored

30 questions are needed before the posttest page can be built.

**Missing:**
- Question text and 4 answer options for all 30 questions
- Correct answer keys (validated server-side)
- Are questions stored in DB or hardcoded in code?
- Who owns and maintains the question set (faculty)?

Cannot build or test the posttest flow without this content.

---

## 2. CRITICAL — Microbe List and Card Content Not Provided

No microbe data exists yet. The game cannot be seeded or tested without it.

**Missing:**
- Complete list of bacteria microbes (exact count TBD)
- Filter tags for each microbe: gramType, isAnaerobe, and any additional categories (full taxonomy — see item 7)
- PNG naming convention for the 600 card images
- Folder structure for Supabase Storage bucket
- Format of the CSV file to be delivered (column names, structure)
- Seed script input: what does the CSV look like?

---

## 3. HIGH — Answer Panel Filter Tag Taxonomy Incomplete

Filter bar requires a complete list of tags. Currently only GRAM+, GRAM−, ANAEROBE are mentioned.

**Missing:**
- Full list of filterable properties across all bacteria microbes
- Which tags map to fields on the `Microbe` model (e.g., `isAnaerobe Boolean`) vs. derived from card category
- Are tags exclusive (one gram type per microbe) or stackable?

---

## 4. HIGH — `microbeIds` Storage Format (Dev Decision)

`GameSession.microbeIds` stores 5 rounds × 3 microbes = 15 server-picked IDs.

**Recommended format** (nested array, easy to scale):
```json
[[id,id,id], [id,id,id], [id,id,id], [id,id,id], [id,id,id]]
```
Access: `microbeIds[roundIndex][microbeInRoundIndex]`. Change `MICROBES_PER_ROUND = 3` to scale.

**Still needs decision:**
- Can the same microbe appear multiple times in one session? (recommend: no duplicates)
- Are microbes picked randomly or weighted by `starRating`? (recommend: random for now)

---

## 5. HIGH — Pathogen Book: Per-Mode or Unified?

Unlock trigger is confirmed (correct answer only). Still unclear:

- Is the Pathogen Book one unified grid showing all game modes?
- Or separate tabs/pages per game mode (bacteria tab, parasite tab)?

---

## 6. HIGH — BGM MP3 Not Yet Delivered

Sound asset (`public/assets/audio/bgm.mp3`) is coming soon but not received.

**Action:** Build the audio player component now with the mute toggle. If the file is absent, audio simply doesn't play — no error. Drop in the file when delivered.

---

## 7. MEDIUM — Card PNG Delivery Format

Naming convention is confirmed (`staphylococcus-aureus-gram-stain-01.png`). Still unknown:

- Will PNGs arrive as a zip, Google Drive folder, or USB/other?
- Delivery timeline?

Cannot run the Supabase Storage upload + seed script until files are received.

---

## 8. MEDIUM — IRB Consent for Posttest

The posttest collects research data. IRB consent language must be approved before pilot.

**Action needed:**
- Draft consent text
- Submit to Ramathibodi ethics committee
- Integrate approved text into the posttest page before any real students see it

---

## 9. MEDIUM — YouTube Tutorial Video URL

Tutorial page will embed a YouTube iframe. URL not yet provided.

**Action:** Build the tutorial page with a placeholder. Swap in the real URL when the video is uploaded.

---

## Summary Checklist

| # | Item | Priority | Owner | Status |
|---|---|---|---|---|
| 1 | Posttest questions authored (30 Qs + answers) | CRITICAL | Faculty | Open |
| 2 | Microbe list + card content + CSV | CRITICAL | Content team | Open |
| 3 | Answer panel filter tag full taxonomy | HIGH | Content team | Open |
| 4 | `microbeIds` format + dedup policy | HIGH | Dev | Open |
| 5 | Pathogen Book: per-mode or unified? | HIGH | Stakeholder | Open |
| 6 | BGM MP3 delivery | HIGH | Content team | Open |
| 7 | Card PNG delivery format (zip/Drive/etc.) | MEDIUM | Content team | Open |
| 8 | IRB consent text for posttest | MEDIUM | PI + IRB | Open |
| 9 | YouTube tutorial video URL | MEDIUM | Stakeholder | Open |
