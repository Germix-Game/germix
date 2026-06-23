"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { GameMode } from "@/types/game";

// Shape of GET /api/game-modes — see src/app/api/game-modes/route.ts
interface GameModesResponse {
  posttestRequired: boolean;
  parasite: { unlocked: boolean; unlocksAt: string | null };
}

export default function LevelSelectPage() {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [modes, setModes] = useState<GameModesResponse | null>(null);

  useEffect(() => {
    fetch("/api/game-modes")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setModes)
      .catch(() => {
        // Fail open on bacteria, fail closed on parasite — see render logic below.
      });
  }, []);

  // Still waiting on /api/game-modes — don't render the locked (grayscale)
  // look yet, since most of the time parasite turns out to be unlocked.
  const modesLoading = !modes;

  // A post-test window blocks every mode (including bacteria) until submitted.
  // Parasite additionally needs its own unlock date to have passed.
  const bacteriaLocked = !!modes?.posttestRequired;
  const parasiteLocked = modesLoading || modes.posttestRequired || !modes.parasite.unlocked;
  // Only paint the grayscale "locked" look once we actually know it's locked —
  // not during the brief window before the fetch resolves.
  const parasiteShowsLocked = !modesLoading && parasiteLocked;
  const parasiteUnlocksAt =
    modes && !modes.posttestRequired && !modes.parasite.unlocked && modes.parasite.unlocksAt
      ? new Date(modes.parasite.unlocksAt).toLocaleDateString()
      : null;

  async function handleSelect(gameMode: GameMode) {
    if (starting) return;
    setStarting(true);
    // Navigate immediately — /play's own loading screen creates the session
    // and fetches the first round, so the player waits there instead of here.
    router.push(`/play?mode=${gameMode}`);
  }

  return (
    <div
        className="relative h-screen w-screen overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/backgrounds/main_page_background.png')" }}
      >
      <Image
        src="/assets/game-selection/germix-graphic-game-26.png"
        alt=""
        aria-hidden
        draggable={false}
        fill
        priority
        sizes="100vw"
        className="pointer-events-none select-none object-contain object-center"
      />

      {/* Bacteria level button — top-left */}
      <Image
        src="/assets/game-selection/bateria_level.png"
        alt="Bacteria"
        draggable={false}
        width={1920}
        height={1080}
        priority
        onClick={() => { if (!bacteriaLocked) handleSelect("BACTERIA"); }}
        className={`absolute h-auto select-none transition-transform duration-200 ${
          starting || bacteriaLocked
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer hover:scale-105"
        }`}
        style={{ top: "2%", left: "12%", width: "37vw" }}
      />

      {/* Parasite level button — bottom-right */}
      <Image
        src="/assets/game-selection/parasite_level.png"
        alt="Parasites"
        draggable={false}
        width={1920}
        height={1080}
        priority
        onClick={() => { if (!parasiteLocked) handleSelect("PARASITE"); }}
        className={`absolute h-auto select-none transition-transform duration-200 ${
          starting || parasiteShowsLocked
            ? "cursor-not-allowed grayscale opacity-50"
            : parasiteLocked
              ? "cursor-not-allowed"
              : "cursor-pointer hover:scale-105"
        }`}
        style={{ bottom: "2%", right: "12%", width: "37vw" }}
      />
      {parasiteUnlocksAt && (
        <p
          className="absolute select-none text-xs font-medium"
          style={{ bottom: "1%", right: "14%", color: "#c8a060", fontFamily: "Arial, sans-serif" }}
        >
          Unlocks {parasiteUnlocksAt}
        </p>
      )}

      {modes?.posttestRequired && (
        <div
          className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-xl border px-5 py-2.5 text-center text-sm"
          style={{
            background: "rgba(61, 26, 10, 0.9)",
            borderColor: "rgba(196, 168, 112, 0.8)",
            color: "#f5e6c8",
            fontFamily: "Arial, sans-serif",
          }}
        >
          A post-test is required before you can play again. Please complete it first.
        </div>
      )}

      {/* Back button — top-left */}
      <button
        onClick={() => router.push("/home")}
        className="absolute left-6 top-[18px] rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
        style={{
          background: "rgba(42, 20, 0, 0.9)",
          borderColor: "rgba(122, 64, 16, 0.8)",
          color: "#c8a060",
          fontFamily: "Arial, sans-serif",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = "rgba(61, 30, 0, 0.9)";
          el.style.borderColor = "rgba(200, 160, 96, 0.8)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = "rgba(42, 20, 0, 0.9)";
          el.style.borderColor = "rgba(122, 64, 16, 0.8)";
        }}
      >
        ← Back
      </button>
    </div>
  );
}
