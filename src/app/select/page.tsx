"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

  // A post-test window blocks every mode (including bacteria) until submitted.
  // Parasite additionally needs its own unlock date to have passed.
  const bacteriaLocked = !!modes?.posttestRequired;
  const parasiteLocked = !modes || modes.posttestRequired || !modes.parasite.unlocked;
  const parasiteUnlocksAt =
    modes && !modes.posttestRequired && !modes.parasite.unlocked && modes.parasite.unlocksAt
      ? new Date(modes.parasite.unlocksAt).toLocaleDateString()
      : null;

  async function handleSelect(gameMode: GameMode) {
    if (starting) return;
    setStarting(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameMode }),
      });
      if (!res.ok) return;
      const session = await res.json();
      localStorage.setItem("currentSessionId", session.id);
      router.push("/play");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div
        className="relative h-screen w-screen overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/backgrounds/main_page_background.png')" }}
      >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/game-selection/germix-graphic-game-26.png"
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute inset-0 select-none"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center",
        }}
      />

      {/* Bacteria level button — top-left */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/game-selection/bateria_level.png"
        alt="Bacteria"
        draggable={false}
        onClick={() => { if (!bacteriaLocked) handleSelect("BACTERIA"); }}
        className={`absolute select-none transition-transform duration-200 ${
          starting || bacteriaLocked
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer hover:scale-105"
        }`}
        style={{ top: "2%", left: "12%", width: "37vw" }}
      />

      {/* Parasite level button — bottom-right */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/game-selection/parasite_level.png"
        alt="Parasites"
        draggable={false}
        onClick={() => { if (!parasiteLocked) handleSelect("PARASITE"); }}
        className={`absolute select-none transition-transform duration-200 ${
          starting || parasiteLocked
            ? "cursor-not-allowed grayscale opacity-50"
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
