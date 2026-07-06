// "use client" → tells Next.js this is a CLIENT component (runs in the browser).
// Required for any component using React hooks (useState, useEffect, etc.) or browser APIs (localStorage, window).
// Without this directive, Next.js 16 treats files as Server Components by default.
"use client";

// React hooks — the building blocks of state and side effects in function components
// useState    → store reactive state (re-renders when changed)
// useEffect   → run code after render (e.g., on mount, when deps change)
// useCallback → memoize a function so it doesn't get recreated every render (perf optimization)
import { useState, useEffect, useCallback, useRef, type RefObject } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createAnimatable, spring } from "animejs";

// Import game UI components from the components folder
// The "@/..." path alias maps to "src/..." (configured in tsconfig.json)
import { CardGrid } from "@/components/game/CardGrid";
import { HeartsBar } from "@/components/game/HeartsBar";
import { ScoreBar } from "@/components/game/ScoreBar";
import { useScaleToFit } from "@/hooks/useScaleToFit";
import { HOME_CRITICAL_ASSETS, preloadImages } from "@/lib/preload-images";

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

// ─── helpers ─────────────────────────────────────────────────────────────────

// DB stores paths without the /assets/ prefix (e.g. "cards/answers/bacteria/foo.png").
function resolveImageSrc(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("/")) return url;
  return `/assets/${url}`;
}

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
// "playing" → user is playing (stays here on wrong answer — player retries same question)
// "end"     → game over screen
type Phase = "loading" | "error" | "playing" | "end";

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
  const [cardsReady, setCardsReady] = useState(false);               // false while pre-fetching card data — cards are unclickable until true

  // ─── STATE: Answer panel (the microbe selection grid) ───────────
  const [microbes, setMicrobes] = useState<Microbe[]>([]);
  const [microbesLoading, setMicrobesLoading] = useState(true);   // true until the microbe list has loaded — shows skeleton cards
  const [selectedMicrobeId, setSelectedMicrobeId] = useState<string | null>(null);
  const [gramFilter, setGramFilter] = useState<GramType | null>(null);
  const [tagFilters, setTagFilters] = useState<Set<MicrobeTag>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const dropTargetRef = useRef<HTMLDivElement>(null);
  const prefetchedCardsRef = useRef<(ClueCard | null)[]>([null, null, null, null, null]);
  const cardsFetchRef = useRef<{ id: string; promise: Promise<{ cards?: unknown } | null> } | null>(null);
  // Guards the bootstrap effect so it runs exactly once. Without it, React
  // StrictMode (on by default in dev) double-invokes the mount effect and
  // creates TWO sessions — the player then sees one session's cards while
  // answers go to the other, so every microbe is graded wrong.
  const didBootstrapRef = useRef(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [pendingMicrobeId, setPendingMicrobeId] = useState<string | null>(null);
  const [dropBlockedMsg, setDropBlockedMsg] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const scoreBarRef = useRef<HTMLDivElement>(null);
  const pointsPillRef = useRef<HTMLDivElement>(null);
  const [scorePop, setScorePop] = useState<{ points: number; startX: number; startY: number } | null>(null);
  const [scoreFlashKey, setScoreFlashKey] = useState(0);
  // Number of /reveal requests still in flight. While > 0 the server hasn't yet
  // recorded every opened card, so answering is blocked until they all land —
  // /answer reads revealed slots straight from the DB and must not race them.
  const [pendingRevealCount, setPendingRevealCount] = useState(0);

  // ─── STATE: Wrong-answer retry tracking ─────────────────────────
  // Set of microbe IDs the player has guessed wrong for the current question.
  // These cards are marked red + disabled so the player can't re-pick them.
  const [wrongMicrobeIds, setWrongMicrobeIds] = useState<Set<string>>(new Set());
  // Once any wrong attempt happens on a question, score is 0 even if correct later.
  const [questionHasWrong, setQuestionHasWrong] = useState(false);
  // The correct microbe (only used in end-screen results when game ends mid-question).
  const [correctMicrobe, setCorrectMicrobe] = useState<AnswerResponse["correctMicrobe"] | null>(null);

  // ─── STATE: End-screen history ──────────────────────────────────
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]); // recap of every round played
  const [won, setWon] = useState(false);                               // did the player win or lose?

  const { containerRef, contentRef, scale } = useScaleToFit();
  const router = useRouter();

  // Warm up the route the player will land on when they exit (back button,
  // "Exit" confirm, or game-over) — prefetch the page chunk and its background
  // art now, while they're busy playing, so /home doesn't load from scratch.
  useEffect(() => {
    router.prefetch("/home");
    preloadImages(HOME_CRITICAL_ASSETS);
  }, [router]);

  // ── bootstrap ────────────────────────────────────────────────────────────
  // useEffect runs AFTER the component renders. With `[]` deps, it runs ONCE on mount.
  // This is the "did the component just appear?" hook — perfect for initial data loading.

  useEffect(() => {
    // Run exactly once. StrictMode (dev) and any remount otherwise re-run this
    // effect, and the ?mode= branch below POSTs a brand-new session each time —
    // creating duplicate sessions with different microbe shuffles. A ref survives
    // the StrictMode unmount/remount, so the second invocation bails here.
    if (didBootstrapRef.current) return;
    didBootstrapRef.current = true;

    // Check the URL for ?demo=true
    // window.location.search → "?demo=true&other=foo"
    // URLSearchParams → parses query string into a key-value reader
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "true") {
      // DEMO MODE branch — skip backend, use hardcoded data
      setIsDemo(true);
      setMicrobes(DEMO_MICROBES);
      setMicrobesLoading(false);
      setCardsReady(true);
      setPhase("playing");
      return; // exit early — don't try to load a real session
    }

    // NEW GAME branch — arrived from /select with ?mode=... — create the
    // session here so the wait happens on this loading screen, not on /select.
    const mode = params.get("mode");
    if (mode) {
      void startNewSession(mode);
      return;
    }

    // REAL MODE branch — get session ID from browser's localStorage
    // localStorage persists across page reloads (until cleared).
    const id = localStorage.getItem("currentSessionId");
    if (!id) { setPhase("error"); return; }   // no session → show error
    setSessionId(id);
    void startCardsFetch(id);                   // fire the cards request now (in parallel with the session fetch) — it only needs the id
    void fetchSession(id);                     // `void` says "I'm intentionally not awaiting this Promise"
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // ↑ The lint rule wants `fetchSession` in deps, but we only want this to run once on mount, so we silence it.
  }, []);

  // Create a brand-new session for the chosen game mode, then load it the
  // same way an existing session would be resumed.
  async function startNewSession(gameMode: string) {
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameMode }),
      });
      if (!res.ok) { setPhase("error"); return; }
      const session = await res.json();
      localStorage.setItem("currentSessionId", session.id);
      setSessionId(session.id);
      void startCardsFetch(session.id);
      void fetchSession(session.id);
    } catch {
      setPhase("error");
    }
  }

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
      void fetchMicrobes(session.gameMode ?? "BACTERIA");
      void fetchCards(id);                                           // pre-fetch all 5 clue cards for instant reveal
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
      setMicrobes(Array.isArray(data.microbes) ? data.microbes : []);
    } catch {
      // Non-fatal: panel will just be empty
    } finally {
      setMicrobesLoading(false);
    }
  }

  // Network request for the cards endpoint, shared between the eager bootstrap
  // call and fetchCards() below so the two never issue duplicate requests —
  // whichever call happens first kicks it off, the other just awaits it.
  async function startCardsFetch(id: string): Promise<{ cards?: unknown } | null> {
    // Keyed by session id: a leftover promise from a DIFFERENT session (e.g. a
    // duplicate session created during a double-mount) must never be reused, or
    // we'd show one session's cards while answering another.
    if (cardsFetchRef.current?.id !== id) {
      cardsFetchRef.current = {
        id,
        promise: fetch(`/api/sessions/${id}/cards`)
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null),
      };
    }
    return cardsFetchRef.current.promise;
  }

  // Pre-fetch all 5 clue cards for the current round into a ref.
  // Using a ref (not state) so card data is available in handleReveal without
  // adding it to the useCallback deps (which would cause CardGrid to re-render).
  async function fetchCards(id: string) {
    setCardsReady(false);
    const unlockTimer = setTimeout(() => setCardsReady(true), 3000); // safety: unlock after 3 s max
    try {
      const data = await startCardsFetch(id);
      if (!data) return;
      if (Array.isArray(data.cards)) {
        const cards = data.cards as ClueCard[];
        prefetchedCardsRef.current = cards;
        // After a page refresh, session slots arrive with revealed:true but no card data.
        // Fill them in now so the skeleton doesn't get stuck.
        setSlots((prev) =>
          prev.map((s) =>
            s.revealed && !s.card && cards[s.index] ? { ...s, card: cards[s.index] } : s,
          ),
        );
      }
    } catch {
      // Silent: handleReveal falls back to per-slot fetch
    } finally {
      clearTimeout(unlockTimer);
      setCardsReady(true); // unlock as soon as fetch resolves (or fails)
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

      // REAL MODE — use pre-fetched card for instant reveal; track server-side in background
      if (!sessionId) return;

      const preCard = prefetchedCardsRef.current[index] ?? null;
      if (preCard) {
        setSlots((prev) =>
          prev.map((s) => (s.index === index ? { ...s, revealed: true, card: preCard } : s)),
        );
        // Track this reveal so answer submission waits for the server to record
        // it. /answer reads revealed slots straight from the DB, so answering
        // before this lands would score/unlock without this card counted.
        setPendingRevealCount((n) => n + 1);
        void fetch(`/api/sessions/${sessionId}/reveal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slotIndex: index }),
        }).finally(() => {
          // Decrement in finally so a network failure still re-enables the UI.
          setPendingRevealCount((n) => n - 1);
        });
        return;
      }

      // Fallback: pre-fetch not ready yet — flip immediately, fill card when server responds
      setSlots((prev) =>
        prev.map((s) => (s.index === index ? { ...s, revealed: true } : s)),
      );
      // Same reveal-in-flight guard as the pre-fetched path above.
      setPendingRevealCount((n) => n + 1);
      try {
        const res = await fetch(`/api/sessions/${sessionId}/reveal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slotIndex: index }),
        });
        if (!res.ok) {
          // Pre-fetch may have arrived during the round-trip — use it if available
          const lateCard = prefetchedCardsRef.current[index] ?? null;
          if (lateCard) setSlots((prev) =>
            prev.map((s) => (s.index === index ? { ...s, card: lateCard } : s)),
          );
          return; // card stays revealed either way — never flip back
        }
        const data = await res.json();
        setSlots((prev) =>
          prev.map((s) => (s.index === index ? { ...s, card: data.card } : s)),
        );
      } catch {
        // Pre-fetch may have arrived during the round-trip — use it if available
        const lateCard = prefetchedCardsRef.current[index] ?? null;
        if (lateCard) setSlots((prev) =>
          prev.map((s) => (s.index === index ? { ...s, card: lateCard } : s)),
        );
        // card stays revealed either way — never flip back
      } finally {
        // Decrement in finally so a network failure still re-enables the UI,
        // and the early `return` on a non-OK response is covered too.
        setPendingRevealCount((n) => n - 1);
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
    phase === "playing" &&
    revealedCount > 0 &&
    selectedMicrobeId !== null &&
    !isSubmitting &&
    pendingRevealCount === 0;

  const canDropAnswer =
    phase === "playing" &&
    revealedCount > 0 &&
    !isSubmitting &&
    pendingRevealCount === 0;

  // The big handler for submitting an answer
  const handleSubmitAnswer = useCallback(async (overrideMicrobeId?: string) => {
    const answerId = overrideMicrobeId ?? selectedMicrobeId;
    if (!answerId || isSubmitting) return;
    setIsSubmitting(true);

    try {
      // ─── DEMO MODE answer logic ───────────────────────────────────
      if (isDemo) {
        // Hardcoded: "Staphylococcus aureus" (id "1") is the right answer
        const correct = answerId === "1";
        const demoCorrect = { id: "1", name: "Staphylococcus aureus", shortName: "S. aureus", imageUrl: "" };

        if (correct) {
          // Score is 0 if the player had any wrong attempt on this question
          const roundScore = questionHasWrong ? 0 : Math.max(0, 100 - (revealedCount - 1) * 20);
          const result: RoundResult = { roundNumber: round, correct: true, roundScore, correctMicrobe: demoCorrect, openedSlots: buildFullSlots() };
          setRoundResults((prev) => [...prev, result]);
          setCorrectMicrobe(demoCorrect);
          if (roundScore > 0) {
            const r = pointsPillRef.current?.getBoundingClientRect();
            setScorePop({ points: roundScore, startX: r ? r.left + r.width / 2 : window.innerWidth / 2, startY: r ? r.top + r.height / 2 : window.innerHeight * 0.4 });
          }
          setScore((s) => s + roundScore);
          if (round >= 5) {
            setWon(true);
            setPhase("end");
          } else {
            setRound((r) => r + 1);
            resetRound();
            setCardsReady(true);
            setPhase("playing");
          }
        } else {
          // Wrong answer: mark this microbe as tried, lose a heart, stay on same question
          const nextHearts = heartsLeft - 1;
          setHeartsLeft(nextHearts);
          setWrongMicrobeIds((prev) => new Set([...prev, answerId]));
          setQuestionHasWrong(true);
          setCorrectMicrobe(demoCorrect);
          setDropBlockedMsg("Wrong answer! Keep trying.");
          setTimeout(() => setDropBlockedMsg(null), 1800);
          if (nextHearts <= 0) {
            const result: RoundResult = { roundNumber: round, correct: false, roundScore: 0, correctMicrobe: demoCorrect, openedSlots: buildFullSlots() };
            setRoundResults((prev) => [...prev, result]);
            setWon(false);
            setPhase("end");
          }
          // else: stay in "playing" — player retries
        }
        return; // demo branch done
      }

      // ─── REAL MODE answer logic ───────────────────────────────────
      if (!sessionId) return;
      // Only the answer is sent. The server reads which cards were revealed
      // straight from the DB — the UI has already waited for every /reveal to
      // land (pendingRevealCount === 0 gates this submission), so the DB is
      // authoritative and there are no client-tracked slots to send.
      const res = await fetch(`/api/sessions/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answeredMicrobeId: answerId }),
      });
      if (!res.ok) return;
      const data: AnswerResponse = await res.json();

      if (data.correct) {
        const result: RoundResult = {
          roundNumber: round,
          correct: true,
          roundScore: data.roundScore,
          correctMicrobe: data.correctMicrobe,
          openedSlots: buildFullSlots(),
        };
        setRoundResults((prev) => [...prev, result]);
        setCorrectMicrobe(data.correctMicrobe);
        setHeartsLeft(data.session.heartsLeft);
        setScore(data.session.totalScore);
        if (data.roundScore > 0) {
          const r = pointsPillRef.current?.getBoundingClientRect();
          setScorePop({ points: data.roundScore, startX: r ? r.left + r.width / 2 : window.innerWidth / 2, startY: r ? r.top + r.height / 2 : window.innerHeight * 0.4 });
        }
        if (data.session.completed) { setWon(true); setPhase("end"); }
        else {
          setRound(data.session.currentRound);
          resetRound();
          void fetchCards(sessionId!);
          setPhase("playing");
        }
      } else {
        // Wrong answer: mark microbe as tried, lose a heart, stay on same question
        setHeartsLeft(data.session.heartsLeft);
        setWrongMicrobeIds((prev) => new Set([...prev, answerId!]));
        setQuestionHasWrong(true);
        setCorrectMicrobe(data.correctMicrobe);
        setDropBlockedMsg("Wrong answer! Keep trying.");
        setTimeout(() => setDropBlockedMsg(null), 1800);
        if (data.session.heartsLeft <= 0) {
          const result: RoundResult = {
            roundNumber: round,
            correct: false,
            roundScore: 0,
            correctMicrobe: data.correctMicrobe,
            openedSlots: buildFullSlots(),
          };
          setRoundResults((prev) => [...prev, result]);
          setWon(false);
          setPhase("end");
        }
        // else: stay in "playing" — player retries same question
      }
    } catch {
      // Leave phase so player can retry
    } finally {
      // `finally` runs whether the try succeeded OR threw — perfect for cleanup
      setIsSubmitting(false);
    }
  }, [sessionId, selectedMicrobeId, isSubmitting, isDemo, round, slots, heartsLeft, revealedCount, questionHasWrong]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset round-specific state (called when starting a new question)
  function resetRound() {
    setSlots([...EMPTY_SLOTS]);
    setSelectedMicrobeId(null);
    setCorrectMicrobe(null);
    setPendingMicrobeId(null);
    setWrongMicrobeIds(new Set());
    setQuestionHasWrong(false);
    setPendingRevealCount(0);
    prefetchedCardsRef.current = [null, null, null, null, null];
    cardsFetchRef.current = null; // next fetchCards() call should hit the network for the new round, not reuse the last round's resolved promise
  }

  // End-screen recap should show all 5 clue cards fully revealed, even ones the
  // player never flipped during play, so they can review the full answer.
  function buildFullSlots(): CardSlotState[] {
    if (isDemo) {
      return DEMO_CARDS.map((card, i) => ({ index: i, revealed: true, card }));
    }
    return slots.map((s, i) => ({
      ...s,
      revealed: true,
      card: s.card ?? prefetchedCardsRef.current[i],
    }));
  }

  const handleDrop = useCallback((id: string) => { setPendingMicrobeId(id); }, []);

  const handleDropRejected = useCallback(() => {
    const msg = revealedCount === 0
      ? "Flip open a clue card first!"
      : "Hold on, submitting your answer...";
    setDropBlockedMsg(msg);
    setTimeout(() => setDropBlockedMsg(null), 2500);
  }, [revealedCount]);

  // ── filters ──────────────────────────────────────────────────────────────

  // Toggle gram filter: click again to clear, click different to switch
  const filterOptions =
    gameMode === "PARASITE"
      ? ([
        ["PROTOZOA", "Protozoa ", "accent-[5c2a0e"],
        ["PLATYHEMINTH", "Platyheminth ", "accent-[5c2a0e"],
        ["NEMATODE", "Nematode ", "accent-[5c2a0e"],
      ] as const)
      : ([
        ["POSITIVE", "GRAM +", "accent-[#5c2a0e]"],
        ["NEGATIVE", "GRAM −", "accent-[#5c2a0e]"],
        ["NONE", "GRAM 0", "accent-[5c2a0e"]
      ] as const);

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

  // Split the search box into lowercased tokens (whitespace-separated).
  // Tokens may appear in any order, so "staph aureus" and "aureus staph" both
  // match "Staphylococcus aureus" — no need to type the exact name letter-by-letter.
  const searchTokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);

  // Apply all active filters to the microbe list — chained .filter() conditions
  const filteredMicrobes = microbes.filter((m) => {
    // Filter 1: gram type
    if (gramFilter && m.gramType !== gramFilter) return false;
    // Filter 2: all selected tags must be present on the microbe
    // [...tagFilters] → spread Set into array so we can use .every()
    if (tagFilters.size > 0 && ![...tagFilters].every((t) => m.tags.includes(t))) return false;
    // Filter 3: name search (case-insensitive). Match across both the full name
    // and the short name, and require every typed token to appear somewhere in
    // that combined text so partial / out-of-order queries still match.
    if (searchTokens.length > 0) {
      const haystack = `${m.name} ${m.shortName}`.toLowerCase();
      if (!searchTokens.every((t) => haystack.includes(t))) return false;
    }
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
      <div
        className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden"
        style={{
          backgroundImage: "url('/assets/ui/wood-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-[#1a0a04]/65" />

        <div className="relative flex flex-col items-center gap-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/ui/game-logo.png"
            alt="Germix"
            width={360}
            style={{
              filter: "drop-shadow(0 6px 28px rgba(0,0,0,0.85))",
              animation: "menu-fade-in 500ms ease-out both",
            }}
            draggable={false}
          />

          <div
            className="flex flex-col items-center gap-4 rounded-xl border border-[#d4a96a]/30 bg-[#2a1208]/75 px-12 py-6 backdrop-blur-sm"
            style={{ animation: "menu-fade-in 500ms ease-out 120ms both" }}
          >
            <p className="font-mono text-[#d4a96a]/90 text-sm tracking-[0.25em] uppercase">
              Loading game
            </p>
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="block h-2.5 w-2.5 rounded-full bg-[#d4a96a]"
                  style={{
                    animation: `loading-bounce 1.1s ease-in-out ${i * 0.18}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
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

  // ─── MAIN GAME SCREEN (phase === "playing", "wrong", or "end") ──────
  // EndScreen renders as a fixed overlay on top — game background stays visible beneath.
  return (
    // Full-screen layout, two zones: wood area (top) + parchment area (bottom)
    // overflow-hidden → prevent scrollbars on the outer container
    <div className="flex flex-col h-screen w-full overflow-hidden">
      {scorePop !== null && (
        <ScorePopup
          points={scorePop.points}
          startX={scorePop.startX}
          startY={scorePop.startY}
          scoreBarRef={scoreBarRef}
          onDone={() => { setScorePop(null); setScoreFlashKey((k) => k + 1); }}
        />
      )}
      {dropBlockedMsg && (
        <div className="popup-toast fixed top-6 left-1/2 z-50 rounded-xl bg-[#2a1208] border border-[#d4a96a] px-5 py-2.5 text-sm font-semibold text-[#f5e6c8] shadow-xl pointer-events-none">
          {dropBlockedMsg}
        </div>
      )}
      {/*
       * IMAGE SLOT H — Game background (wood texture)
       * What: Dark wood-grain texture filling the entire top area
       *       (behind cards, top bar, hearts, score).
       * Source: /public/assets/ui/wood-bg.png (served at /assets/ui/wood-bg.png)
       * Applied on the next div via Tailwind arbitrary-value bg utility + bg-cover + bg-center.
       * To swap: drop a new file at /public/assets/ui/wood-bg.png — no code change needed.
       */}
      {/* ── Wood area (top zone: cards + score/hearts) ───────────────── */}
      {/* flex-shrink-0 → don't let this zone shrink when parchment grows */}
      {/* Arbitrary background image (Tailwind bg-[url-syntax]), bg-cover scales to fill, bg-center centers it */}
      <div
        ref={containerRef}
        className="relative flex flex-col px-6 pt-[7vh] pb-2 bg-[url('/assets/ui/wood-bg.png')] bg-cover bg-center flex-1 basis-1/2 min-h-0 overflow-hidden"
      >
        {/* Top bar: Score (left) + Exit (right) — pinned to the very top of the screen */}
        <div className="absolute top-2 inset-x-6 z-20 flex items-center justify-between">
          <ScoreBar ref={scoreBarRef} score={score} flashKey={scoreFlashKey} />
          <button
            onClick={() => setShowExitConfirm(true)}
            className="flex items-center gap-2 rounded-lg border border-[#6b3520] bg-[#2a1208]/80 px-4 py-1.5 text-xl font-bold text-[#d4a96a] shadow transition-all duration-150 hover:scale-105 hover:bg-[#3d1a0a] hover:text-[#f5e6c8] active:scale-95"
          >
            <span className="text-xl leading-none">✕</span>
            Exit
          </button>
        </div>

        <div className="pointer-events-none absolute left-1/2 top-0 z-0 -translate-x-1/2 -translate-y-[42%]">
          <img
            src={`/assets/ui/round-${6 - round}.png`}
            alt={`Round ${round} of 5`}
            className="h-[15vh] w-auto max-w-[85vw] object-contain select-none pointer-events-none"
            draggable={false}
          />
        </div>

        {phase === "playing" && (
          <div className="flex justify-center mt-6 mb-4">
            <div ref={pointsPillRef} className="flex items-baseline gap-1.5 px-4 py-1 rounded-full bg-[#2a1208]/85 border border-[#d4a96a]/50 shadow-lg">
              <span className="text-[#d4a96a] text-[0.65rem] font-semibold uppercase tracking-wider">Answer now for</span>
              <span className="text-[#f5e6c8] text-base font-black tabular-nums">
                {questionHasWrong ? 0 : Math.max(0, 100 - Math.max(0, revealedCount - 1) * 20)}
              </span>
              <span className="text-[#d4a96a] text-[0.65rem] font-semibold">pts</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-3 w-full">
          <div className="flex-shrink-0">
            <HeartsBar heartsLeft={heartsLeft} vertical />
          </div>
          <CardGrid
            slots={slots}
            onReveal={handleReveal}
            locked={phase !== "playing" || !cardsReady}
            canAnswer={canAnswer}
            isSubmitting={isSubmitting}
            onAnswer={handleSubmitAnswer}
            dropTargetRef={dropTargetRef}
            isDraggingOver={isDraggingOver}
            pendingMicrobeName={
              pendingMicrobeId
                ? (microbes.find((m) => m.id === pendingMicrobeId)?.shortName ?? null)
                : null
            }
            pendingMicrobeImage={
              pendingMicrobeId
                ? (resolveImageSrc(
                  microbes.find((m) => m.id === pendingMicrobeId)?.answerImageUrl,
                ) || null)
                : null
            }
            onConfirm={() => {
              if (pendingMicrobeId) void handleSubmitAnswer(pendingMicrobeId);
              setPendingMicrobeId(null);
            }}
            onCancelPending={() => setPendingMicrobeId(null)}
          />
        </div>

        {questionHasWrong && phase === "playing" && (
          <div className="popup-bar mt-4 flex items-center gap-3 rounded-xl border border-[#6b3520] bg-[#3d1a0a]/70 px-4 py-2.5">
            <span className="text-red-400 font-black text-lg leading-none">✕</span>
            <p className="text-[#f5e6c8] text-sm font-medium">
              Wrong attempt — 0 pts for this microbe. Keep trying!
            </p>
          </div>
        )}
      </div>

      {/* ── Parchment area (bottom zone: filters + microbe answer panel) ── */}
      <div className="flex flex-col bg-[#f0d9a8] flex-1 basis-1/2 min-h-0 overflow-y-auto">

        {/* Filter bar — gram type checkboxes, search, and biological tag checkboxes */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3 border-b border-[#c4a870] bg-[#f0d9a8] flex-shrink-0">

          {/* GRAM-TYPE FILTERS — rendered from a tuple array using .map() */}
          {/* `as const` → tells TypeScript these are literal types, not generic strings */}
          {filterOptions.map(([value, label, accentClass]) => (
            <label key={value} className="flex cursor-pointer items-center gap-1.5 select-none">
              <input
                type="checkbox"
                checked={gramFilter === value}
                onChange={() => toggleGram(value)}
                className={`${accentClass} h-3.5 w-3.5`}
              />
              <span className="text-[#3a2010] text-base font-semibold">{label}</span>
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

          {/* TAG FILTERS (anaerobe) — same .map pattern as gram filters */}
          {gameMode === "BACTERIA" &&
            ([
              ["ANAEROBE", "ANAEROBE"],
            ] as const).map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-1.5 select-none">
                <input
                  type="checkbox"
                  checked={tagFilters.has(value)}
                  onChange={() => toggleTag(value)}
                  className="accent-[#5c2a0e] h-3.5 w-3.5"
                />
                <span className="text-[#3a2010] text-base font-semibold">{label}</span>
              </label>
            ))}
        </div>

        {/* MICROBE SELECTION GRID */}
        {/* role="listbox" → accessibility hint that this is a selectable list */}
        <div
          className="px-6 py-4"
          role="listbox"
          aria-label="Select a microbe to answer"
        >
          {microbesLoading ? (
            // Loading state — microbe list hasn't arrived from the server yet
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {Array.from({ length: 16 }, (_, i) => (
                <MicrobeCardSkeleton key={i} index={i} />
              ))}
            </div>
          ) : filteredMicrobes.length === 0 ? (
            // Empty state — no microbes match the active filters
            <p className="pt-8 text-center text-sm text-[#9a7850]">
              No microbes match your filters.
            </p>
          ) : (
            // Responsive grid: 4 columns on mobile, more on larger screens
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {filteredMicrobes.map((microbe, i) => (
                <DraggableMicrobeCard
                  key={microbe.id}
                  index={i}
                  microbe={microbe}
                  selected={selectedMicrobeId === microbe.id}
                  dropTargetRef={dropTargetRef}
                  canDrop={canDropAnswer}
                  onDrop={handleDrop}
                  onDropRejected={handleDropRejected}
                  onDragStateChange={setIsDraggingOver}
                  isWrong={wrongMicrobeIds.has(microbe.id)}
                />
              ))}
            </div>
          )}
        </div>

      </div>

      {showExitConfirm && (
        <div className="end-screen-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="end-screen-panel flex flex-col gap-5 rounded-2xl border border-[#c4a870] bg-[#f0d9a8] p-7 shadow-2xl w-full max-w-xs text-center">
            <div>
              <h2 className="text-xl font-bold text-[#5c2a0e]">Exit Game?</h2>
              <p className="mt-1 text-sm text-[#6a4a30]">Your score will <span className="font-semibold text-[#8b2020]">not</span> be counted. You will need to restart the game.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="balatro-btn flex-1 rounded-lg bg-[#4a3020] py-2.5 text-sm font-semibold text-[#d4a96a] hover:bg-[#5a4030]"
              >
                Cancel
              </button>
              <Link
                href="/home"
                className="balatro-btn flex-1 rounded-lg bg-[#8b2020] py-2.5 text-sm font-semibold text-white hover:bg-[#a02828] text-center"
              >
                Exit
              </Link>
            </div>
          </div>
        </div>
      )}

      {phase === "end" && (
        <EndScreen
          won={won}
          results={roundResults}
          score={score}
          onExit={() => router.push("/home")}
        />
      )}
    </div>
  );
}

// ─── draggable microbe card ───────────────────────────────────────────────────

function DraggableMicrobeCard({
  microbe,
  selected,
  dropTargetRef,
  canDrop,
  onDrop,
  onDropRejected,
  onDragStateChange,
  index,
  isWrong,
}: {
  microbe: Microbe;
  selected: boolean;
  dropTargetRef: RefObject<HTMLDivElement | null>;
  canDrop: boolean;
  onDrop: (id: string) => void;
  onDropRejected: () => void;
  onDragStateChange: (isOver: boolean) => void;
  index: number;
  isWrong: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null; }
    const el = tiltRef.current;
    if (!el) return;
    el.classList.remove("card-idle");
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const angle = Math.atan2(y - 0.5, x - 0.5) * (180 / Math.PI) + 90;
    el.style.transform = `perspective(500px) rotateX(${(0.5 - y) * 30}deg) rotateY(${(x - 0.5) * 30}deg) scale3d(1.1,1.1,1.1)`;
    el.style.transition = "transform 60ms linear";
    if (shineRef.current) {
      shineRef.current.style.background = [
        `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,220,0.6) 0%, transparent 52%)`,
        `linear-gradient(${angle}deg, rgba(255,80,80,0.08), rgba(80,255,180,0.08), rgba(80,130,255,0.08))`,
      ].join(", ");
      shineRef.current.style.opacity = "1";
    }
  }

  function handleMouseLeave() {
    const el = tiltRef.current;
    if (!el) return;
    el.style.transition = "transform 500ms cubic-bezier(0.23,1,0.32,1)";
    el.style.transform = "perspective(500px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
    if (shineRef.current) shineRef.current.style.opacity = "0";
    leaveTimer.current = setTimeout(() => {
      if (tiltRef.current) {
        tiltRef.current.style.transform = "";
        tiltRef.current.style.transition = "";
        tiltRef.current.classList.add("card-idle");
      }
      leaveTimer.current = null;
    }, 500);
  }
  const canDropRef = useRef(canDrop);
  const onDropRef = useRef(onDrop);
  const onDropRejectedRef = useRef(onDropRejected);
  const onDragStateChangeRef = useRef(onDragStateChange);
  const isWrongRef = useRef(isWrong);
  canDropRef.current = canDrop;
  onDropRef.current = onDrop;
  onDropRejectedRef.current = onDropRejected;
  onDragStateChangeRef.current = onDragStateChange;
  isWrongRef.current = isWrong;

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const releaseSpring = spring({ stiffness: 350, damping: 25 });

    let ghost: HTMLElement | null = null;
    let ghostAnim: ReturnType<typeof createAnimatable> | null = null;
    let startPX = 0;
    let startPY = 0;

    const isPointerOverTarget = (cx: number, cy: number) => {
      const drop = dropTargetRef.current;
      if (!drop) return false;
      const r = drop.getBoundingClientRect();
      return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
    };

    // Attached to document on drag start so the pointer can move freely over
    // any element (including the scroll container) without losing events.
    const onPointerMove = (e: PointerEvent) => {
      if (!ghostAnim) return;
      ghostAnim.translateX(e.clientX - startPX);
      ghostAnim.translateY(e.clientY - startPY);
      if (canDropRef.current) {
        onDragStateChangeRef.current(isPointerOverTarget(e.clientX, e.clientY));
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);

      if (!ghost || !ghostAnim) return;
      const capturedGhost = ghost;
      const capturedAnim = ghostAnim;
      ghost = null;
      ghostAnim = null;

      el.style.opacity = "";

      const overTarget = isPointerOverTarget(e.clientX, e.clientY);
      const dropped = canDropRef.current && overTarget;
      if (dropped) onDropRef.current(microbe.id);
      else if (overTarget && !canDropRef.current) onDropRejectedRef.current();
      onDragStateChangeRef.current(false);

      if (dropped) {
        // Successful drop — just remove the ghost immediately
        capturedGhost.remove();
      } else {
        // Missed drop — spring back to origin
        capturedAnim.translateX(0, releaseSpring.settlingDuration, releaseSpring);
        capturedAnim.translateY(0, releaseSpring.settlingDuration, releaseSpring);
        capturedAnim.scale(1, 200, "outQuad");
        setTimeout(() => capturedGhost.remove(), releaseSpring.settlingDuration + 50);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (isWrongRef.current) return; // wrong answers are disabled
      e.preventDefault();

      const rect = el.getBoundingClientRect();
      startPX = e.clientX;
      startPY = e.clientY;

      ghost = el.cloneNode(true) as HTMLElement;
      Object.assign(ghost.style, {
        position: "fixed",
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        margin: "0",
        pointerEvents: "none",
        zIndex: "9999",
      });
      document.body.appendChild(ghost);

      ghostAnim = createAnimatable(ghost, {
        translateX: { duration: 0 },
        translateY: { duration: 0 },
        scale: { ease: "outQuad", duration: 100 },
      });
      ghostAnim.scale(1.12);

      el.style.opacity = "0.3";

      // Register move/up on document so any element the pointer passes over
      // cannot intercept or lose the events
      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
      document.addEventListener("pointercancel", onPointerUp);
    };

    el.addEventListener("pointerdown", onPointerDown);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
      ghost?.remove();
    };
  }, [microbe.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const src = resolveImageSrc(microbe.answerImageUrl);
  const label = microbe.shortName ?? microbe.name ?? "";

  return (
    <div
      ref={tiltRef}
      className="card-tilt card-idle w-full"
      style={{
        aspectRatio: "3/4",
        "--card-idle-delay": `${(index % 9) * 0.18}s`,
      } as React.CSSProperties}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={shineRef} className="card-shine" aria-hidden />
      <div
        ref={cardRef}
        role="option"
        aria-selected={selected}
        aria-disabled={isWrong}
        style={{ touchAction: "none", width: "100%", height: "100%" }}
        className={`relative overflow-hidden rounded-xl transition-colors ${isWrong
          ? "border-red-500 opacity-50 cursor-not-allowed"
          : selected
            ? "cursor-grab border-[#5c2a0e] shadow-sm"
            : "cursor-grab border-transparent hover:border-[#c4a870]"
          }`}
        onDoubleClick={() => {
          if (isWrong) return;
          if (canDrop) onDrop(microbe.id); else onDropRejected();
        }}
      >
        {/* Card face — image fills the whole card */}
        <div className="absolute inset-0 bg-[#e0c890] flex items-center justify-center">
          <span className="px-1 text-center text-[0.5rem] font-medium italic leading-tight text-[#5c2a0e]">
            {label}
          </span>
          {src && (
            <img
              src={src}
              alt={label}
              className="absolute inset-0 h-full w-full object-contain"
              loading="lazy"
            />
          )}
        </div>

        {/* Name strip at the bottom */}
        {/* <div className="absolute bottom-0 inset-x-0 bg-[#2a1208]/70 px-1 py-0.5">
        <span className="block w-full text-center text-[0.5rem] leading-tight italic text-[#f5e6c8] line-clamp-2">
          {label}
        </span>
      </div> */}

        {/* Wrong-answer overlay — red tint + ✕ icon */}
        {isWrong && (
          <div className="absolute inset-0 rounded-xl bg-red-600/30 flex items-center justify-center">
            <span className="text-red-400 font-black text-xl drop-shadow">✕</span>
          </div>
        )}
        {/* Selection highlight overlay */}
        {selected && !isWrong && (
          <div className="absolute inset-0 rounded-xl ring-2 ring-inset ring-[#5c2a0e] bg-[#5c2a0e]/10" />
        )}
      </div>
    </div>
  );
}

// ─── microbe card skeleton (loading placeholder) ──────────────────────────────

// Light-grey placeholder shown in the answer grid while the microbe list is loading.
// Same aspect ratio + rounded shape as DraggableMicrobeCard so the grid doesn't jump on load.
function MicrobeCardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="w-full animate-pulse rounded-xl bg-[#d8d8d8] overflow-hidden relative"
      style={{
        aspectRatio: "3/4",
        animationDelay: `${(index % 9) * 0.07}s`,
      }}
    >
      <div className="absolute inset-0 bg-[#c8c8c8]" />
      <div className="absolute bottom-0 inset-x-0 h-3 bg-[#bcbcbc]" />
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
  const src = resolveImageSrc(microbe.imageUrl ?? microbe.answerImageUrl);
  const label = microbe.shortName ?? microbe.name ?? "";
  // Different sizing for small (grid) vs large (feedback bar / end-screen) variants.
  // lg matches the real answer-card art ratio (1428x2000 PNGs) so the image isn't squished/cropped.
  const dim = size === "sm" ? "w-full aspect-square" : "w-[8.75rem] flex-shrink-0";

  return (
    // Template literal merges static + dynamic classes
    <div
      className={`${dim} relative rounded-lg overflow-hidden bg-[#e0c890] flex items-center justify-center`}
      style={size === "lg" ? { aspectRatio: "1428 / 2000" } : undefined}
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
          className="absolute inset-0 h-full w-full object-contain"
          loading="lazy"                                            // don't load until scrolled near
          onError={(e) => { e.currentTarget.style.display = "none"; }} // hide if broken (text fallback shows through)
        />
      )}
    </div>
  );
}


// ─── end screen ───────────────────────────────────────────────────────────────

function EndScreen({
  won,
  results,
  score,
  onExit,
}: {
  won: boolean;
  results: RoundResult[];
  score: number;
  onExit: () => void;
}) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let raf: number;
    const DELAY = 650;
    const DURATION = 1000;
    const start = Date.now();

    const tick = () => {
      const t = Math.min((Date.now() - start) / DURATION, 1);
      const eased = 1 - (1 - t) * (1 - t); // ease-out quad
      setDisplayScore(Math.round(eased * score));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    const timeout = setTimeout(() => { raf = requestAnimationFrame(tick); }, DELAY);
    return () => { clearTimeout(timeout); cancelAnimationFrame(raf); };
  }, [score]);

  return (
    <div className="end-screen-overlay fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/60 p-4">

      {/* ── Standalone headline — stands ALONE above the pop-up, not inside it ── */}
      <h1
        className={`text-6xl sm:text-7xl font-extrabold uppercase tracking-wider text-center select-none drop-shadow-[0_4px_14px_rgba(0,0,0,0.7)] ${
          won ? "text-[#ffd42a]" : "text-[#ff3b3b]"
        }`}
      >
        {won ? "You Win" : "Game Over"}
      </h1>

      <div className="end-screen-panel flex flex-col w-full max-w-7xl max-h-[78vh] bg-[#f0d9a8] rounded-2xl border border-[#c4a870] shadow-2xl overflow-hidden">

        {/* ── Title + score ─────────────────────────────────────── */}
        <div className="relative flex items-center justify-between px-8 py-5 flex-shrink-0 border-b border-[#c4a870]">
          <button
            onClick={onExit}
            aria-label="Exit"
            className="absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-full text-[#5c2a0e] hover:bg-[#c4a870]/40 transition-colors"
          >
            ✕
          </button>
          <div>
            <p className="font-mono text-[#3a2010] text-lg tabular-nums">
              Final score: {String(displayScore).padStart(4, "0")}
            </p>
          </div>
        </div>

        {/* ── Round results ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
          {results.map((result, i) => (
            <RoundReviewRow key={i} result={result} attemptNumber={i + 1} />
          ))}
        </div>

      </div>
    </div>
  );
}

// SUB-COMPONENT: one row in the end-screen recap (shows revealed cards + correct microbe per round)
function RoundReviewRow({ result, attemptNumber }: { result: RoundResult; attemptNumber: number }) {
  return (
    <div className="rounded-xl border border-[#c4a870] bg-[#e8cd94] p-4">

      <div className="flex items-center gap-2 mb-3">
        <span className="text-[#5c2a0e] text-sm font-medium">Microbe {attemptNumber}</span>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${result.correct
            ? "bg-green-600/20 text-green-800"
            : "bg-red-600/20 text-red-800"
            }`}
        >
          {result.correct ? `+${result.roundScore}` : "Wrong"}
        </span>
      </div>

      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex gap-2">
          {result.openedSlots.map((slot) => (
            <div
              key={slot.index}
              className="w-[8.75rem] flex-shrink-0 rounded-lg overflow-hidden"
              style={{ aspectRatio: "1429 / 2000" }}
            >
              {slot.revealed && slot.card ? (
                <ClueCardThumb card={slot.card} />
              ) : (
                <div className="h-full w-full rounded-lg bg-[#c4a870] border border-[#b09060]" />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 ml-2">
          <MicrobeThumb microbe={result.correctMicrobe} size="lg" />
          <span className="italic text-base font-medium text-[#3a2010]">{result.correctMicrobe.name}</span>
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
    <div className="h-full w-full relative rounded-lg bg-[#f5e6c8] flex flex-col items-center justify-center gap-1 p-1.5">
      <span className="text-[0.7rem] uppercase tracking-wide text-[#9a7850] text-center leading-tight w-full">
        {card.category.replace(/_/g, " ")}
      </span>
      <span className="text-[0.85rem] text-[#3a2010] text-center leading-snug italic line-clamp-5">
        {card.label}
      </span>
      {/* Real image overlay if URL is provided */}
      {card.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolveImageSrc(card.imageUrl)}
          alt={card.label}
          className="absolute inset-0 h-full w-full object-contain rounded-lg"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      )}
    </div>
  );
}

// ─── score popup ──────────────────────────────────────────────────────────────

function ScorePopup({
  points,
  startX,
  startY,
  scoreBarRef,
  onDone,
}: {
  points: number;
  startX: number;
  startY: number;
  scoreBarRef: RefObject<HTMLDivElement | null>;
  onDone: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const flyTimer = setTimeout(() => {
      const el = ref.current;
      const bar = scoreBarRef.current;
      if (!el || !bar) return;
      const barRect = bar.getBoundingClientRect();
      const dx = barRect.left + barRect.width / 2 - startX;
      const dy = barRect.top + barRect.height / 2 - startY;
      el.style.animation = "none";
      void el.offsetHeight;
      el.style.transition = "transform 420ms cubic-bezier(0.4,0,1,1), opacity 340ms ease-in 80ms";
      el.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.15)`;
      el.style.opacity = "0";
    }, 680);

    const doneTimer = setTimeout(onDone, 1120);
    return () => { clearTimeout(flyTimer); clearTimeout(doneTimer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={ref}
      className="score-expand fixed pointer-events-none select-none z-50"
      style={{
        top: startY,
        left: startX,
        transform: "translate(-50%, -50%)",
        color: "#d4a96a",
        fontSize: "4.5rem",
        fontWeight: 900,
        lineHeight: 1,
        textShadow: "0 0 40px rgba(212,169,106,0.65), 0 4px 24px rgba(0,0,0,0.9)",
        whiteSpace: "nowrap",
      }}
    >
      +{points}
    </div>
  );
}
