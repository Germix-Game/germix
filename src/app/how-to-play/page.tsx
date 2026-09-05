import Link from "next/link";
import Image from "next/image";
import { Alice } from "next/font/google";

const alice = Alice({ weight: "400", subsets: ["latin"] });
// https://youtu.be/pnYAGnHUo8E
const YOUTUBE_VIDEO_ID = "pnYAGnHUo8E";

const RULES = [
  { step: "1", title: "5 rounds, 1 mystery pathogen each", body: "Every round hides a different microbe. Your goal is to identify it." },
  { step: "2", title: "Each round starts with a clinical manifestation card", body: "Five clue cards. The first card reveals the clinical manifestation. Flip the other cards to uncover more characteristics." },
  { step: "3", title: "Pick your answer", body: "Drag the correct microbe from the Pathogen list. You can answer at any time — fewer clues means a higher score." },
  { step: "4", title: "Scoring", body: "100 points if you open 1 more clue, 75 for 2, 50 for 3, and 25 for 4. Maximum possible score: 500 per game." },
  { step: "5", title: "Hearts system", body: "You start with 3 hearts. Each wrong answer costs 1 heart. Lose all 3 and the game ends." },
] as const;

export default function HowToPlayPage() {
  const videoId = YOUTUBE_VIDEO_ID;

  return (
    <div
      className={`${alice.className} min-h-screen w-full bg-cover bg-center px-4 py-8`}
      style={{ backgroundImage: "url('/assets/backgrounds/main_page_background.webp')" }}
    >
      <Link
        href="/home"
        className="tap-min safe-top safe-left fixed z-20 flex items-center rounded-lg border border-[#d4a96a] bg-[#2a1208]/80 px-4 text-sm font-semibold text-[#f5e6c8] transition-colors hover:bg-[#3d1a0a]"
      >
        ← Back
      </Link>

      <div className="mx-auto max-w-5xl pt-12 sm:pt-0">
        <h1 className="sr-only">How to Play</h1>
        <div className="relative">
          <Image
            src="/assets/how-to-play/rules.webp"
            alt=""
            width={1719}
            height={2664}
            className="h-auto w-full"
            unoptimized
            preload
          />
          {/* Keep the rules accessible while the image supplies their visual layout. */}
          <ol className="sr-only">
            {RULES.map((rule) => (
              <li key={rule.step}>
                <h2>{rule.title}</h2>
                <p>{rule.body}</p>
              </li>
            ))}
          </ol>
          {/* Align the video with the blank area beneath the printed heading. */}
          <div className="absolute left-[12%] top-[68%] aspect-video w-[76%] overflow-hidden rounded-lg bg-[#1a0a04] shadow-lg">
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube.com/embed/${videoId}`}
              title="How to Play Germix"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
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
