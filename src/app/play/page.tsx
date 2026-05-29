// "use client" → tells Next.js this is a CLIENT component (runs in the browser).
// Required for any component using React hooks (useState, useEffect, etc.) or browser APIs (localStorage, window).
// Without this directive, Next.js 16 treats files as Server Components by default.
"use client";

// React hooks — the building blocks of state and side effects in function components
// useState    → store reactive state (re-renders when changed)
// useEffect   → run code after render (e.g., on mount, when deps change)
// useCallback → memoize a function so it doesn't get recreated every render (perf optimization)
import { useState, useEffect, useCallback } from "react";

// Import game UI components from the components folder
// The "@/..." path alias maps to "src/..." (configured in tsconfig.json)
import { CardGrid } from "@/components/game/CardGrid";
import { HeartsBar } from "@/components/game/HeartsBar";
import { ScoreBar } from "@/components/game/ScoreBar";

// `import type` → imports ONLY TypeScript types (erased at build time, zero runtime cost)
// These types describe the shape of game data — defined in src/types/game.ts
import type {
  CardSlotState,      // shape of one card slot (index, revealed?, card data)
  ClueCard,           // shape of a clue card (category, label, image)
  Microbe,            // shape of a microbe answer option
  AnswerResponse,     // shape of the API response when player submits an answer
  MicrobeTag,         // enum of tags like "AEROBE", "SPORE_FORMER"
  GramType,           // enum: "POSITIVE" | "NEGATIVE" | "ACID_FAST"
  RoundResult,        // shape of one round's outcome (for end-screen recap)
} from "@/types/game";

// ─── constants ────────────────────────────────────────────────────────────────

// Pre-built empty slots array — 5 unrevealed card slots indexed 0–4.
// Array.from({ length: 5 }, (_, i) => ...) → creates an array of length 5,
// where each element is the result of the callback (i = the index 0,1,2,3,4).
const EMPTY_SLOTS: CardSlotState[] = Array.from({ length: 5 }, (_, i) => ({
  index: i,
  revealed: false,  // not flipped yet
  card: null,       // no clue assigned yet
}));

// DEMO MODE clue cards — shown when ?demo=true is in the URL.
// Real game pulls these from the backend; demo uses these hardcoded ones.
const DEMO_CARDS: ClueCard[] = [
  { category: "GRAM_STAIN", label: "Gram-positive cocci in clusters", imageUrl: "" },
  { category: "VIRULENCE_FACTOR", label: "Produces coagulase enzyme", imageUrl: "" },
  { category: "LAB_CHARACTERISTIC", label: "Golden-yellow colonies on agar", imageUrl: "" },
  { category: "SPECIAL_TRAIT", label: "Beta-haemolytic on blood agar", imageUrl: "" },
  { category: "CLINICAL_MANIFESTATION", label: "Causes skin abscesses & bacteraemia", imageUrl: "" },
];

// DEMO MODE microbe answer choices — the 18 microbes shown in the answer panel.
// In real play, these come from `/api/pathogen-book`.
// Each microbe has: id, full name, abbreviated name, image, gram type, and biological tags.
const DEMO_MICROBES: Microbe[] = [
  { id: "1", name: "Staphylococcus aureus", shortName: "S. aureus", answerImageUrl: "", gramType: "POSITIVE", tags: ["AEROBE", "FACULTATIVE_ANAEROBE"] },
  { id: "2", name: "Streptococcus pneumoniae", shortName: "S. pneumoniae", answerImageUrl: "", gramType: "POSITIVE", tags: ["AEROBE", "ENCAPSULATED"] },
  { id: "3", name: "Streptococcus pyogenes", shortName: "S. pyogenes", answerImageUrl: "", gramType: "POSITIVE", tags: ["AEROBE"] },
  { id: "4", name: "Enterococcus faecalis", shortName: "E. faecalis", answerImageUrl: "", gramType: "POSITIVE", tags: ["FACULTATIVE_ANAEROBE"] },
  { id: "5", name: "Clostridium difficile", shortName: "C. difficile", answerImageUrl: "", gramType: "POSITIVE", tags: ["ANAEROBE", "SPORE_FORMER"] },
  { id: "6", name: "Clostridium perfringens", shortName: "C. perfringens", answerImageUrl: "", gramType: "POSITIVE", tags: ["ANAEROBE", "SPORE_FORMER"] },
  { id: "7", name: "Bacillus anthracis", shortName: "B. anthracis", answerImageUrl: "", gramType: "POSITIVE", tags: ["AEROBE", "SPORE_FORMER", "ENCAPSULATED"] },
  { id: "8", name: "Listeria monocytogenes", shortName: "L. monocytogenes", answerImageUrl: "", gramType: "POSITIVE", tags: ["FACULTATIVE_ANAEROBE", "INTRACELLULAR"] },
  { id: "9", name: "Escherichia coli", shortName: "E. coli", answerImageUrl: "", gramType: "NEGATIVE", tags: ["AEROBE", "FACULTATIVE_ANAEROBE"] },
  { id: "10", name: "Klebsiella pneumoniae", shortName: "K. pneumoniae", answerImageUrl: "", gramType: "NEGATIVE", tags: ["AEROBE", "ENCAPSULATED"] },
  { id: "11", name: "Pseudomonas aeruginosa", shortName: "P. aeruginosa", answerImageUrl: "", gramType: "NEGATIVE", tags: ["AEROBE"] },
  { id: "12", name: "Neisseria meningitidis", shortName: "N. meningitidis", answerImageUrl: "", gramType: "NEGATIVE", tags: ["AEROBE", "ENCAPSULATED"] },
  { id: "13", name: "Helicobacter pylori", shortName: "H. pylori", answerImageUrl: "", gramType: "NEGATIVE", tags: ["AEROBE"] },
  { id: "14", name: "Vibrio cholerae", shortName: "V. cholerae", answerImageUrl: "", gramType: "NEGATIVE", tags: ["FACULTATIVE_ANAEROBE"] },
  { id: "15", name: "Salmonella typhi", shortName: "S. typhi", answerImageUrl: "", gramType: "NEGATIVE", tags: ["FACULTATIVE_ANAEROBE", "INTRACELLULAR"] },
  { id: "16", name: "Bacteroides fragilis", shortName: "B. fragilis", answerImageUrl: "", gramType: "NEGATIVE", tags: ["ANAEROBE", "ENCAPSULATED"] },
  { id: "17", name: "Mycobacterium tuberculosis", shortName: "M. tuberculosis", answerImageUrl: "", gramType: "ACID_FAST", tags: ["AEROBE", "INTRACELLULAR"] },
  { id: "18", name: "Mycobacterium leprae", shortName: "M. leprae", answerImageUrl: "", gramType: "ACID_FAST", tags: ["INTRACELLULAR"] },
];

// ─── types ────────────────────────────────────────────────────────────────────

// Game phases — like a tiny state machine. Only one phase is active at a time.
// "loading" → fetching session     "error" → no session found
// "playing" → user is playing      "wrong" → just got wrong answer (showing feedback)
// "end"     → game over screen
type Phase = "loading" | "error" | "playing" | "wrong" | "end";

// ─── page ────────────────────────────────────────────────────────────────────

// The actual page component — renders at the "/play" URL.
export default function PlayPage() {
  // ─── STATE: Session & game flow ─────────────────────────────────
  // Each useState returns [currentValue, setterFunction].
  // Calling the setter triggers a re-render with the new value.

  const [sessionId, setSessionId] = useState<string | null>(null);   // backend session ID (null until loaded)
  const [isDemo, setIsDemo] = useState(false);                       // true if URL has ?demo=true
  const [phase, setPhase] = useState<Phase>("loading");              // current game phase (see Phase type above)
  const [slots, setSlots] = useState<CardSlotState[]>(EMPTY_SLOTS);  // the 5 clue card slots
  const [heartsLeft, setHeartsLeft] = useState(3);                   // lives remaining (start at 3)
  const [score, setScore] = useState(0);                             // total score across all rounds
  const [round, setRound] = useState(1);                             // current round number (1-indexed)
  const [gameMode, setGameMode] = useState("BACTERIA");              // "BACTERIA" | future modes
  const [isSubmitting, setIsSubmitting] = useState(false);           // true while an answer fetch is in-flight (prevents double-submit)

  // ─── STATE: Answer panel (the microbe selection grid) ───────────
  const [microbes, setMicrobes] = useState<Microbe[]>([]);                       // all microbes for this game mode
  const [selectedMicrobeId, setSelectedMicrobeId] = useState<string | null>(null); // which microbe is currently selected
  const [gramFilter, setGramFilter] = useState<GramType | null>(null);           // filter by gram type (or null for no filter)
  const [tagFilters, setTagFilters] = useState<Set<MicrobeTag>>(new Set());      // multi-select tag filters (Set = no duplicates)
  const [searchQuery, setSearchQuery] = useState("");                            // search input text

  // ─── STATE: Wrong-answer feedback ───────────────────────────────
  // After a wrong answer, we display the correct microbe here.
  const [correctMicrobe, setCorrectMicrobe] = useState<AnswerResponse["correctMicrobe"] | null>(null);

  // ─── STATE: End-screen history ──────────────────────────────────
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]); // recap of every round played
  const [won, setWon] = useState(false);                               // did the player win or lose?

  // ── bootstrap ────────────────────────────────────────────────────────────
  // useEffect runs AFTER the component renders. With `[]` deps, it runs ONCE on mount.
  // This is the "did the component just appear?" hook — perfect for initial data loading.

  useEffect(() => {
    // Check the URL for ?demo=true
    // window.location.search → "?demo=true&other=foo"
    // URLSearchParams → parses query string into a key-value reader
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "true") {
      // DEMO MODE branch — skip backend, use hardcoded data
      setIsDemo(true);
      setMicrobes(DEMO_MICROBES);
      setPhase("playing");
      return; // exit early — don't try to load a real session
    }

    // REAL MODE branch — get session ID from browser's localStorage
    // localStorage persists across page reloads (until cleared).
    const id = localStorage.getItem("currentSessionId");
    if (!id) { setPhase("error"); return; }   // no session → show error
    setSessionId(id);
    void fetchSession(id);                     // `void` says "I'm intentionally not awaiting this Promise"
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // ↑ The lint rule wants `fetchSession` in deps, but we only want this to run once on mount, so we silence it.
  }, []);

  // Fetch session data from the backend
  // `async` makes the function return a Promise; `await` pauses until a Promise resolves.
  async function fetchSession(id: string) {
    try {
      // Template literal `${id}` → string interpolation
      const res = await fetch(`/api/sessions/${id}`);
      if (!res.ok) { setPhase("error"); return; }   // 404, 500, etc.
      const session = await res.json();              // parse JSON body

      // Restore session state from server response
      setHeartsLeft(session.heartsLeft);
      setScore(session.totalScore);
      setRound(session.currentRound);
      setSlots(session.slots ?? EMPTY_SLOTS);                       // `??` = "use right side if left is null/undefined"
      setGameMode(session.gameMode ?? "BACTERIA");
      setPhase("playing");
      void fetchMicrobes(session.gameMode ?? "BACTERIA");            // load microbes for answer panel
    } catch {
      // Network error or JSON parse error → fall back to error phase
      setPhase("error");
    }
  }

  // Fetch the list of microbes (answer choices) for the current game mode
  async function fetchMicrobes(mode: string) {
    try {
      const res = await fetch(`/api/pathogen-book?gameMode=${mode}`);
      if (!res.ok) return;
      const data = await res.json();
      // Defensive: only set if it's actually an array (avoids breaking the .filter() later)
      setMicrobes(Array.isArray(data) ? data : []);
    } catch {
      // Non-fatal: panel will just be empty
    }
  }

  // ── card reveal ──────────────────────────────────────────────────────────
  // useCallback memoizes this function — same reference across renders unless deps change.
  // Useful because CardGrid receives it as a prop; without useCallback, CardGrid would re-render unnecessarily.

  const handleReveal = useCallback(
    // Called when player clicks a card slot
    async (index: number) => {
      // Only allow reveal during active play
      if (phase !== "playing") return;

      // DEMO MODE — just flip the card using hardcoded data
      if (isDemo) {
        // setSlots(prev => ...) → use the "function form" of setState.
        // `prev` is the current array; we return a new array with one slot updated.
        // .map() creates a new array (immutable update — React requires new references for re-render).
        setSlots((prev) =>
          prev.map((s) =>
            // If this is the slot we're flipping, return a new object with revealed=true and the card filled in
            s.index === index ? { ...s, revealed: true, card: DEMO_CARDS[index] } : s,
            // `{ ...s, revealed: true }` → spread the old slot's fields, then override `revealed`
          ),
        );
        return;
      }

      // REAL MODE — call backend to reveal the card
      if (!sessionId) return;
      try {
        const res = await fetch(`/api/sessions/${sessionId}/reveal`, {
          method: "POST",                                                // POST because we're changing server state
          headers: { "Content-Type": "application/json" },                // tells server the body is JSON
          body: JSON.stringify({ slotIndex: index }),                     // serialize the JS object to a JSON string
        });
        if (!res.ok) return;
        const data = await res.json();
        // Update the slot with the card the server gave us
        setSlots((prev) =>
          prev.map((s) => (s.index === index ? { ...s, revealed: true, card: data.card } : s)),
        );
      } catch {
        // Network error — silently leave slot unrevealed; user can try again
      }
    },
    // Dependencies: re-create this function if any of these change
    [sessionId, phase, isDemo],
  );

  // ── answer submission ────────────────────────────────────────────────────

  // How many cards has the player revealed? Used to:
  //  - Decide if the "Answer" button is enabled (need at least 1 revealed)
  //  - Calculate score (fewer reveals = more points)
  const revealedCount = slots.filter((s) => s.revealed).length;

  // Whether the player CAN currently submit an answer
  // All conditions must be true:
  const canAnswer =
    phase === "playing" &&         // must be in playing phase
    revealedCount > 0 &&            // must have revealed at least one clue
    selectedMicrobeId !== null &&   // must have picked a microbe
    !isSubmitting;                  // must not already be submitting

  // The big handler for submitting an answer
  const handleSubmitAnswer = useCallback(async () => {
    // Guard: bail if nothing selected or already submitting (prevents double-submit)
    if (!selectedMicrobeId || isSubmitting) return;
    setIsSubmitting(true);

    try {
      // ─── DEMO MODE answer logic ───────────────────────────────────
      if (isDemo) {
        // Hardcoded: "Staphylococcus aureus" (id "1") is the right answer
        const correct = selectedMicrobeId === "1";

        // Scoring: start at 100, lose 20 per extra revealed card (more clues = lower score)
        // Math.max(0, ...) → never go below 0
        const roundScore = correct ? Math.max(0, 100 - (revealedCount - 1) * 20) : 0;
        const demoCorrect = { id: "1", name: "Staphylococcus aureus", shortName: "S. aureus", imageUrl: "" };

        // Build a result object and append to history (for end-screen recap)
        const result: RoundResult = { roundNumber: round, correct, roundScore, correctMicrobe: demoCorrect, openedSlots: slots };
        // `[...prev, result]` → new array with all old items plus the new one (immutable append)
        setRoundResults((prev) => [...prev, result]);
        setCorrectMicrobe(demoCorrect);

        if (correct) {
          setScore((s) => s + roundScore);  // functional update — based on previous score
          if (round >= 5) {
            // Won the game (5 rounds completed)
            setWon(true);
            setPhase("end");
          } else {
            // Move to next round
            setRound((r) => r + 1);
            resetRound();
            setPhase("playing");
          }
        } else {
          // Wrong answer: lose a heart
          const nextHearts = heartsLeft - 1;
          setHeartsLeft(nextHearts);
          // Reveal all remaining cards (so player sees the full puzzle)
          setSlots((prev) => prev.map((s) => ({ ...s, revealed: true })));
          if (nextHearts <= 0) { setWon(false); setPhase("end"); }  // out of lives → game over
          else setPhase("wrong");                                     // show wrong-answer feedback
        }
        return; // demo branch done
      }

      // ─── REAL MODE answer logic ───────────────────────────────────
      if (!sessionId) return;
      const res = await fetch(`/api/sessions/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answeredMicrobeId: selectedMicrobeId }),
      });
      if (!res.ok) return;
      // Server tells us if the answer was correct, the score, etc.
      const data: AnswerResponse = await res.json();

      // Record this round in history
      const result: RoundResult = {
        roundNumber: round,
        correct: data.correct,
        roundScore: data.roundScore,
        correctMicrobe: data.correctMicrobe,
        openedSlots: slots,
      };
      setRoundResults((prev) => [...prev, result]);
      setCorrectMicrobe(data.correctMicrobe);
      setHeartsLeft(data.session.heartsLeft);                          // server is source of truth for hearts
      setScore(data.session.totalScore);

      if (data.correct) {
        if (data.session.completed) { setWon(true); setPhase("end"); } // server says game over → win screen
        else { setRound(data.session.currentRound); resetRound(); setPhase("playing"); }
      } else {
        setSlots((prev) => prev.map((s) => ({ ...s, revealed: true }))); // reveal all on wrong
        if (data.session.heartsLeft <= 0) { setWon(false); setPhase("end"); }
        else setPhase("wrong");
      }
    } catch {
      // Leave phase so player can retry
    } finally {
      // `finally` runs whether the try succeeded OR threw — perfect for cleanup
      setIsSubmitting(false);
    }
  }, [sessionId, selectedMicrobeId, isSubmitting, isDemo, round, slots, heartsLeft, revealedCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset round-specific state (called when starting a new round)
  function resetRound() {
    setSlots([...EMPTY_SLOTS]);     // fresh copy of empty slots (`...` spreads array)
    setSelectedMicrobeId(null);
    setCorrectMicrobe(null);
  }

  // Called when player clicks "Next Microbe" after a wrong answer
  function handleNext() {
    setRound((r) => r + 1);
    resetRound();
    setPhase("playing");
  }

  // ── filters ──────────────────────────────────────────────────────────────

  // Toggle gram filter: click again to clear, click different to switch
  function toggleGram(gram: GramType) {
    setGramFilter((prev) => (prev === gram ? null : gram));
  }

  // Toggle a tag filter on/off in the Set
  function toggleTag(tag: MicrobeTag) {
    setTagFilters((prev) => {
      const next = new Set(prev);  // clone (don't mutate prev — React requires new reference)
      // Ternary used for side effect (eslint won't love this — could be rewritten as if/else)
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  }

  // Apply all active filters to the microbe list — chained .filter() conditions
  const filteredMicrobes = microbes.filter((m) => {
    // Filter 1: gram type
    if (gramFilter && m.gramType !== gramFilter) return false;
    // Filter 2: all selected tags must be present on the microbe
    // [...tagFilters] → spread Set into array so we can use .every()
    if (tagFilters.size > 0 && ![...tagFilters].every((t) => m.tags.includes(t))) return false;
    // Filter 3: name search (case-insensitive)
    if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true; // passed all filters
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  // From here down, we return different JSX based on `phase`.
  // This is the "render different screens for different states" pattern.

  // ─── LOADING SCREEN ─────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#5c2a0e]">
        {/* animate-pulse → Tailwind utility that fades opacity in/out (loading shimmer) */}
        <p className="font-mono text-[#d4a96a] text-lg animate-pulse">Loading game…</p>
      </div>
    );
  }

  // ─── ERROR SCREEN ───────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-[#5c2a0e]">
        <p className="text-[#f5e6c8] text-lg">No active session found.</p>
        {/* <a href> here does a FULL page navigation. Use <Link> from "next/link" for client-side nav (faster). */}
        <a
          href="/select"
          className="rounded-lg bg-[#d4a96a] px-6 py-2.5 font-semibold text-[#2a1208] hover:bg-[#e0b87a] transition-colors"
        >
          Start a new game
        </a>
      </div>
    );
  }

  // ─── END SCREEN ─────────────────────────────────────────────
  if (phase === "end") {
    return (
      // Delegated to the <EndScreen> subcomponent defined below
      // `onPlayAgain` is a callback prop — child calls it when player clicks the button
      <EndScreen
        won={won}
        results={roundResults}
        score={score}
        onPlayAgain={() => {
          if (isDemo) {
            // Demo: just reset everything in-place
            setRound(1); setScore(0); setHeartsLeft(3);
            setRoundResults([]); setWon(false);
            resetRound();
            setPhase("playing");
          } else {
            // Real mode: go back to game mode selection
            window.location.href = "/select";
          }
        }}
      />
    );
  }

  // ─── MAIN GAME SCREEN (phase === "playing" or "wrong") ──────
  return (
    // Full-screen layout, two zones: wood area (top) + parchment area (bottom)
    // overflow-hidden → prevent scrollbars on the outer container
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/*
       * IMAGE SLOT H — Game background (wood texture)
       * What: Dark wood-grain texture filling the entire top area
       *       (behind cards, top bar, hearts, score).
       * Source: /public/asset/ui/wood-bg.png (served at /asset/ui/wood-bg.png)
       * Applied on the next div via Tailwind arbitrary-value bg utility + bg-cover + bg-center.
       * To swap: drop a new file at /public/asset/ui/wood-bg.png — no code change needed.
       */}
      {/* ── Wood area (top zone: cards + score/hearts) ───────────────── */}
      {/* flex-shrink-0 → don't let this zone shrink when parchment grows */}
      {/* Arbitrary background image (Tailwind bg-[url-syntax]), bg-cover scales to fill, bg-center centers it */}
      <div className="flex flex-col px-6 pt-4 pb-6 bg-[url('/asset/ui/wood-bg.png')] bg-cover bg-center flex-shrink-0">

        {/* Top bar: Score on left, Hearts on right (round counter moved below as a centered image) */}
        {/* justify-between → pushes children to opposite ends */}
        <div className="flex items-center justify-between">
          <ScoreBar score={score} />
          <HeartsBar heartsLeft={heartsLeft} />
        </div>

        {/*
         * ROUND COUNTER IMAGE — centered above the card slots.
         * Source: /public/asset/ui/round-${round}.png (one per round: round-1.png … round-5.png)
         * `round` is 1-indexed (1, 2, 3, 4, 5).
         * If a file for the current round is missing, the alt text + broken-image icon will show
         * — that's intentional so missing assets are obvious during dev.
         * `-mt-8` pulls the image upward so it sits closer to the very top of the wood area
         * (overlapping vertically with the score/hearts row, but centered horizontally between them).
         */}
        <div className="flex justify-center -mt-8 mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/asset/ui/round-${round}.png`}
            alt={`Round ${round} of 5`}
            className="h-[10.5rem] w-[40rem] object-contain select-none pointer-events-none"
            // h-[10.5rem] w-[40rem] → fixed 168×640px display box, identical for every round
            // object-contain → scales the image to fit inside the box without cropping or stretching;
            //                  any leftover space stays transparent. This normalizes the on-screen size
            //                  even if round-1.png and round-2.png have different source dimensions.
            // select-none → can't be highlighted by drag (feels more like a graphic, less like text)
            // pointer-events-none → clicks pass through (not interactive)
            draggable={false}
          />
        </div>

        {/* The 5 clue cards + the "Answer" button (all packaged inside CardGrid) */}
        {/* Props flow DOWN: parent passes data + callbacks; child calls callbacks to notify parent */}
        <CardGrid
          slots={slots}                          // current state of all 5 slots
          onReveal={handleReveal}                // called when a card is clicked
          locked={phase !== "playing"}           // cards become unclickable outside "playing"
          canAnswer={canAnswer}                  // is the answer button enabled?
          isSubmitting={isSubmitting}            // show loading state on answer button
          onAnswer={handleSubmitAnswer}          // called when answer button is clicked
        />

        {/* Wrong-answer feedback bar — only shows during "wrong" phase */}
        {/* `{condition && <JSX>}` → conditional rendering (shorthand for "render JSX if condition is truthy") */}
        {phase === "wrong" && correctMicrobe && (
          <div className="mt-4 flex items-center gap-4 rounded-xl border border-[#6b3520] bg-[#3d1a0a]/70 p-3">
            {/* /70 in bg-[#3d1a0a]/70 → 70% opacity */}
            <MicrobeThumb microbe={correctMicrobe} size="lg" />
            {/* min-w-0 → required for text-truncate to work inside flex children */}
            <div className="flex-1 min-w-0">
              <p className="text-[#d4a96a] text-xs mb-0.5">Correct answer:</p>
              <p className="text-[#f5e6c8] italic font-medium truncate">{correctMicrobe.name}</p>
            </div>
            {/* flex-shrink-0 → button stays full size even if text gets long */}
            <button
              onClick={handleNext}
              className="flex-shrink-0 rounded-lg bg-[#d4a96a] px-5 py-2 font-semibold text-[#2a1208] hover:bg-[#e0b87a] transition-colors focus-visible:ring-2 focus-visible:ring-[#d4a96a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#5c2a0e]"
            >
              Next Microbe →
            </button>
          </div>
        )}
      </div>

      {/* ── Parchment area (bottom zone: filters + microbe answer panel) ── */}
      {/* flex-1 → fill remaining height; min-h-0 → allow inner scroll to work */}
      <div className="flex flex-col flex-1 min-h-0 bg-[#f0d9a8]">

        {/* Filter bar — gram type checkboxes, search, and biological tag checkboxes */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3 border-b border-[#c4a870] flex-shrink-0">

          {/* GRAM-TYPE FILTERS — rendered from a tuple array using .map() */}
          {/* `as const` → tells TypeScript these are literal types, not generic strings */}
          {(
            [
              ["POSITIVE", "GRAM +"],
              ["NEGATIVE", "GRAM −"],
              ["ACID_FAST", "ACID-FAST"],
            ] as const
          ).map(([value, label]) => (
            // Destructuring the tuple: [value, label] = ["POSITIVE", "GRAM +"]
            // `key={value}` → React needs a unique key on each list item for efficient updates
            <label key={value} className="flex cursor-pointer items-center gap-1.5 select-none">
              <input
                type="checkbox"
                checked={gramFilter === value}            // "controlled" input — React owns the state
                onChange={() => toggleGram(value)}        // run our toggle function when user clicks
                className="accent-[#5c2a0e] h-3.5 w-3.5"  // accent-* colors the checkbox itself
              />
              <span className="text-[#3a2010] text-sm font-medium">{label}</span>
            </label>
          ))}

          {/* SEARCH INPUT */}
          {/* `relative` parent → required for absolute-positioned children (the icon & × button) inside */}
          <div className="relative flex-1 min-w-36">
            {/* Search icon (inline SVG) */}
            {/* pointer-events-none → click goes through to the input behind it */}
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9a7850]"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}                                                // controlled
              onChange={(e) => setSearchQuery(e.target.value)}                   // sync state on every keystroke
              placeholder="Search…"
              className="h-8 w-full rounded-full border border-[#c4a870] bg-white/60 pl-9 pr-8 text-sm text-[#3a2010] placeholder-[#9a7850] focus:outline-none focus:ring-2 focus:ring-[#5c2a0e]/30"
            />
            {/* "×" clear button — only renders when there's text to clear */}
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a7850] hover:text-[#5c2a0e] text-base leading-none"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* TAG FILTERS (anaerobe, aerobe, spore-former) — same .map pattern as gram filters */}
          {(
            [
              ["ANAEROBE", "ANAEROBE"],
              ["AEROBE", "AEROBE"],
              ["SPORE_FORMER", "SPORE-FORMER"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex cursor-pointer items-center gap-1.5 select-none">
              <input
                type="checkbox"
                checked={tagFilters.has(value)}             // Set.has() to check if active
                onChange={() => toggleTag(value)}
                className="accent-[#5c2a0e] h-3.5 w-3.5"
              />
              <span className="text-[#3a2010] text-sm font-medium">{label}</span>
            </label>
          ))}
        </div>

        {/* MICROBE SELECTION GRID */}
        {/* overflow-y-auto → scroll when there are too many to fit */}
        {/* role="listbox" → accessibility hint that this is a selectable list */}
        <div
          className="flex-1 overflow-y-auto px-6 py-4"
          role="listbox"
          aria-label="Select a microbe to answer"
        >
          {filteredMicrobes.length === 0 ? (
            // Empty state — no microbes match the active filters
            <p className="pt-8 text-center text-sm text-[#9a7850]">
              No microbes match your filters.
            </p>
          ) : (
            // Responsive grid: 4 columns on mobile, more on larger screens
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
              {filteredMicrobes.map((microbe) => {
                const selected = selectedMicrobeId === microbe.id;
                return (
                  <button
                    key={microbe.id}
                    role="option"
                    aria-selected={selected}
                    onClick={() =>
                      // Toggle behavior: click selected one again → deselect
                      setSelectedMicrobeId((prev) =>
                        prev === microbe.id ? null : microbe.id,
                      )
                    }
                    // Template literal with conditional class string
                    // Selected microbe gets a darker border + bg; unselected get hover styles
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 p-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-[#5c2a0e] focus-visible:ring-offset-1 ${
                      selected
                        ? "border-[#5c2a0e] bg-[#5c2a0e]/15 shadow-sm"
                        : "border-transparent bg-white/40 hover:bg-white/70 hover:border-[#c4a870]"
                    }`}
                  >
                    <MicrobeThumb microbe={microbe} size="sm" />
                    {/* line-clamp-2 → truncate to 2 lines with ellipsis */}
                    <span className="w-full text-center text-[0.65rem] leading-tight italic text-[#3a2010] line-clamp-2">
                      {microbe.shortName}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* SELECTED-MICROBE STRIP — only shows when something is selected */}
        {selectedMicrobeId && (
          <SelectedMicrobeBar
            // .find() returns first match or undefined → fallback to null for type safety
            microbe={microbes.find((m) => m.id === selectedMicrobeId) ?? null}
            onClear={() => setSelectedMicrobeId(null)}
          />
        )}
      </div>
    </div>
  );
}

// ─── shared image component with text fallback ────────────────────────────────

/*
 * IMAGE SLOT C — Microbe answer card thumbnail
 * File: src/app/play/page.tsx  →  <MicrobeThumb>
 * What: The cartoon microbe illustration shown in three places:
 *   1. Answer panel grid — every selectable microbe card
 *   2. Selected-microbe strip (bottom of parchment area)
 *   3. Wrong-answer feedback bar (correct microbe revealed after a wrong guess)
 *   4. End-screen round review (correct microbe per round)
 * Source: Microbe.answerImageUrl — Supabase Storage CDN URL set during the seed import.
 *         One PNG per microbe.  e.g. "staphylococcus-aureus-answer.png"
 * Replace: No code change needed — upload PNGs to Supabase Storage and populate
 *          Microbe.answerImageUrl via the seed script.  The <img> below picks it up automatically.
 */
// SUB-COMPONENT: reusable microbe thumbnail.
// Used in 4 places (see comment above). Defined here instead of separate file because it's tightly coupled to this page.
function MicrobeThumb({
  microbe,
  size,
}: {
  // Inline prop types — `microbe` is partial because callers pass different shapes
  microbe: { name?: string; shortName?: string; imageUrl?: string; answerImageUrl?: string };
  size: "sm" | "lg";  // union type — only these two strings allowed
}) {
  // Pick whichever URL is set first
  const src = microbe.imageUrl ?? microbe.answerImageUrl ?? "";
  const label = microbe.shortName ?? microbe.name ?? "";
  // Different sizing for small (grid) vs large (feedback bar) variants
  const dim = size === "sm" ? "w-full aspect-square" : "h-14 w-14 flex-shrink-0";

  return (
    // Template literal merges static + dynamic classes
    <div
      className={`${dim} relative rounded-lg overflow-hidden bg-[#e0c890] flex items-center justify-center`}
    >
      {/* Text fallback — sits behind the <img>; visible until image loads (or if it fails) */}
      <span className="px-1 text-center text-[0.5rem] font-medium italic leading-tight text-[#5c2a0e]">
        {label}
      </span>
      {/* Only render <img> if we have a URL */}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        // ↑ Next.js prefers <Image>, but here we use <img> because src is dynamic from a CDN
        <img
          src={src}
          alt={label}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"                                            // don't load until scrolled near
          onError={(e) => { e.currentTarget.style.display = "none"; }} // hide if broken (text fallback shows through)
        />
      )}
    </div>
  );
}

// SUB-COMPONENT: the "selected microbe" bar shown at the bottom of the parchment area
function SelectedMicrobeBar({
  microbe,
  onClear,
}: {
  microbe: Microbe | null;
  onClear: () => void;            // callback type: takes nothing, returns nothing
}) {
  if (!microbe) return null;       // early return — render nothing if no microbe
  return (
    <div className="flex items-center gap-3 border-t border-[#c4a870] bg-[#e8cd94] px-6 py-2.5 flex-shrink-0">
      <MicrobeThumb microbe={microbe} size="lg" />
      {/* truncate → text-overflow:ellipsis on overflow */}
      <span className="flex-1 min-w-0 italic text-sm text-[#3a2010] truncate">
        {microbe.name}
      </span>
      <button
        onClick={onClear}
        className="text-[#9a7850] hover:text-[#5c2a0e] text-lg leading-none"
        aria-label="Clear selection"
      >
        ×
      </button>
    </div>
  );
}

// ─── end screen ───────────────────────────────────────────────────────────────

// SUB-COMPONENT: the post-game summary screen shown when phase === "end"
function EndScreen({
  won,
  results,
  score,
  onPlayAgain,
}: {
  won: boolean;
  results: RoundResult[];
  score: number;
  onPlayAgain: () => void;
}) {
  return (
    <div className="flex h-screen w-screen flex-col bg-[#5c2a0e] overflow-hidden">

      {/* HEADER: title (Win/Lose) + final score + Play Again button */}
      <div className="flex items-center justify-between px-8 py-5 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[#d4a96a]">
            {/* Inline ternary in JSX */}
            {won ? "You Win!" : "Game Over"}
          </h1>
          {/* tabular-nums → fixed-width digits so numbers don't jitter when they change */}
          <p className="font-mono text-[#f5e6c8] text-lg tabular-nums mt-0.5">
            {/* String(123).padStart(4, "0") → "0123" — pad with leading zeros to 4 digits */}
            Final score: {String(score).padStart(4, "0")}
          </p>
        </div>
        <button
          onClick={onPlayAgain}
          className="rounded-lg bg-[#d4a96a] px-6 py-2.5 font-semibold text-[#2a1208] hover:bg-[#e0b87a] transition-colors"
        >
          Play Again
        </button>
      </div>

      {/* SCROLLABLE LIST of round recaps */}
      {/* space-y-4 → vertical gap between siblings */}
      <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-4">
        {results.map((result) => (
          // Each round gets a row — key={roundNumber} for React's diffing
          <RoundReviewRow key={result.roundNumber} result={result} />
        ))}
      </div>
    </div>
  );
}

// SUB-COMPONENT: one row in the end-screen recap (shows revealed cards + correct microbe per round)
function RoundReviewRow({ result }: { result: RoundResult }) {
  return (
    <div className="rounded-xl border border-[#6b3520] bg-[#3d1a0a]/60 p-4">

      {/* Round label + result pill (green if correct, red if wrong) */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[#d4a96a] text-sm font-medium">Round {result.roundNumber}</span>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            result.correct
              ? "bg-green-800/40 text-green-300"
              : "bg-red-800/40 text-red-300"
          }`}
        >
          {/* Template literal: show "+score" if correct, "Wrong" otherwise */}
          {result.correct ? `+${result.roundScore}` : "Wrong"}
        </span>
      </div>

      {/* CARDS ROW: opened clue cards + correct microbe answer */}
      <div className="flex items-start gap-3">
        <div className="flex gap-1.5">
          {/* Loop over all 5 slots — show the clue if revealed, else a blank back */}
          {result.openedSlots.map((slot) => (
            <div
              key={slot.index}
              className="h-14 w-10 flex-shrink-0 rounded overflow-hidden"
            >
              {slot.revealed && slot.card ? (
                <ClueCardThumb card={slot.card} />
              ) : (
                <div className="h-full w-full rounded bg-[#4a2210] border border-[#6b3520]" />
              )}
            </div>
          ))}
        </div>
        {/* Correct microbe shown to the right of the clue row */}
        <div className="flex items-center gap-2.5 ml-2">
          <MicrobeThumb microbe={result.correctMicrobe} size="lg" />
          <span className="italic text-sm text-[#f5e6c8]">{result.correctMicrobe.name}</span>
        </div>
      </div>
    </div>
  );
}

/*
 * IMAGE SLOT D — Clue card thumbnail in the end-screen round review
 * File: src/app/play/page.tsx  →  <ClueCardThumb>
 * What: Small thumbnail of each clue card shown in the end-screen recap row.
 *       Same PNG as IMAGE SLOT B (CardSlot front face) — just displayed at a smaller size.
 * Source: card.imageUrl — same Supabase Storage CDN URL as the in-game card.
 * Replace: No code change needed — populated automatically once seed script runs.
 */
// SUB-COMPONENT: thumbnail version of a clue card (used in end-screen)
function ClueCardThumb({ card }: { card: ClueCard }) {
  return (
    <div className="h-full w-full relative rounded bg-[#f5e6c8] flex flex-col items-center justify-center gap-0.5 p-1">
      {/* Text fallback line 1: category (e.g. "GRAM STAIN") */}
      {/* .replace(/_/g, " ") → swap underscores for spaces with a regex (g = global, all occurrences) */}
      <span className="text-[0.4rem] uppercase tracking-wide text-[#9a7850] text-center leading-tight">
        {card.category.replace(/_/g, " ")}
      </span>
      {/* Text fallback line 2: the clue label */}
      <span className="text-[0.45rem] text-[#3a2010] text-center leading-tight italic line-clamp-3">
        {card.label}
      </span>
      {/* Real image overlay if URL is provided */}
      {card.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.imageUrl}
          alt={card.label}
          className="absolute inset-0 h-full w-full object-cover rounded"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      )}
    </div>
  );
}
