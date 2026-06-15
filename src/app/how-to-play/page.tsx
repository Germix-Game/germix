import Link from "next/link";
import { Alice } from "next/font/google";

const alice = Alice({ weight: "400", subsets: ["latin"] });

const YOUTUBE_VIDEO_ID = "dQw4w9WgXcQ";

const RULES = [
  { step: "1", title: "5 rounds, 1 mystery pathogen each", body: "Every round hides a different microbe. Your goal is to identify it." },
  { step: "2", title: "Reveal clue cards one at a time", body: "Five clue cards are face-down. Flip them to uncover Gram stain, virulence factors, lab traits, and more." },
  { step: "3", title: "Pick your answer", body: "Select the correct microbe from the Pathogen Book. You can answer at any time — fewer clues means a higher score." },
  { step: "4", title: "Scoring", body: "100 pts for 1 clue · 80 for 2 · 60 for 3 · 40 for 4 · 20 for 5. Maximum possible score: 500." },
  { step: "5", title: "Hearts system", body: "You start with 3 hearts. Each wrong answer costs 1 heart. Lose all 3 and the game ends." },
] as const;

export default function HowToPlayPage() {
  const videoId = YOUTUBE_VIDEO_ID;

  return (
    <div
      className={`${alice.className} min-h-screen w-full bg-cover bg-center px-4 py-8`}
      style={{ backgroundImage: "url('/assets/backgrounds/main_page_background.png')" }}
    >
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/home"
            className="flex h-9 items-center rounded-lg border border-[#d4a96a] bg-[#2a1208]/80 px-4 text-sm font-semibold text-[#f5e6c8] transition-colors hover:bg-[#3d1a0a]"
          >
            ← Back
          </Link>
          <h1
            className="text-2xl font-bold tracking-wide text-[#d4a96a]"
            style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}
          >
            HOW TO PLAY
          </h1>
        </div>

        {/* YouTube embed */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-[#d4a96a]/60 bg-[#1a0a04]/90">
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube.com/embed/${videoId}`}
              title="How to Play Germix"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

        {/* Rules */}
        <div className="rounded-2xl border border-[#d4a96a]/60 bg-[#1a0a04]/90 px-5 py-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#d4a96a]">
            Game Rules
          </h2>
          <ol className="space-y-4">
            {RULES.map((rule) => (
              <li key={rule.step} className="flex gap-4">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-[#d4a96a]/60 text-sm font-bold text-[#d4a96a]">
                  {rule.step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#f5e6c8]">{rule.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#9a7850]">{rule.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-5 flex justify-center">
          <Link
            href="/select"
            className="flex h-[52px] w-[200px] items-center justify-center rounded-[18px] border-2 border-[#265215] bg-[#3a7d20] text-xl text-white shadow-[3px_4px_8px_rgba(0,0,0,0.4)] transition-colors hover:border-[#80d040] hover:bg-[#4da030]"
            style={{ fontFamily: "'Impact','Arial Black',sans-serif", letterSpacing: "0.05em" }}
          >
            ▶&nbsp;&nbsp;PLAY NOW
          </Link>
        </div>
      </div>
    </div>
  );
}
