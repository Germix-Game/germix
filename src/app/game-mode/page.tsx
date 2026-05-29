"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type ModeStatus = { unlocked: true } | { unlocked: false; unlocksAt?: string };

interface GameModesResponse {
  bacteria: ModeStatus;
  parasite: ModeStatus;
  fungi: ModeStatus;
  virus: ModeStatus;
  posttestRequired: boolean;
}

const MODES: { key: keyof Omit<GameModesResponse, "posttestRequired">; label: string; apiValue: string }[] = [
  { key: "bacteria", label: "Bacteria", apiValue: "BACTERIA" },
  { key: "parasite", label: "Parasite", apiValue: "PARASITE" },
  { key: "fungi", label: "Fungi", apiValue: "FUNGI" },
  { key: "virus", label: "Virus", apiValue: "VIRUS" },
];

export default function GameModePage() {
  const router = useRouter();
  const [modes, setModes] = useState<GameModesResponse | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/game-modes")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setModes)
      .catch(() => setLoadError(true));
  }, []);

  async function handleSelect(apiValue: string) {
    if (starting) return;
    setStarting(apiValue);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameMode: apiValue }),
      });
      if (!res.ok) {
        setStarting(null);
        return;
      }
      const session = await res.json();
      localStorage.setItem("currentSessionId", session.id);
      router.push("/play");
    } catch {
      setStarting(null);
    }
  }

  if (loadError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#5c2a0e]">
        <p className="text-[#f5e6c8]">Failed to load game modes. Please refresh.</p>
      </div>
    );
  }

  if (!modes) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#5c2a0e]">
        <p className="font-mono text-[#d4a96a] text-lg animate-pulse">Loading…</p>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen w-screen flex-col items-center justify-center gap-10 px-6 py-12 bg-[#5c2a0e] bg-[url('/assets/ui/wood-bg.png')] bg-cover bg-center"
    >
      <h1 className="text-3xl font-bold text-[#d4a96a] tracking-wide">Select Game Mode</h1>

      {modes.posttestRequired && (
        <div className="w-full max-w-xl rounded-xl border border-[#c4a870] bg-[#3d1a0a]/80 px-5 py-3 text-center text-sm text-[#f5e6c8]">
          A post-test is required before you can play again. Please complete it first.
        </div>
      )}

      <div className="grid grid-cols-2 gap-5 w-full max-w-xl sm:grid-cols-4">
        {MODES.map(({ key, label, apiValue }) => {
          const status = modes[key] as ModeStatus;
          const locked = !status.unlocked || modes.posttestRequired;
          const unlocksAt =
            !status.unlocked && "unlocksAt" in status && status.unlocksAt
              ? new Date(status.unlocksAt).toLocaleDateString()
              : null;
          const isStarting = starting === apiValue;

          return (
            <button
              key={key}
              disabled={locked}
              onClick={() => handleSelect(apiValue)}
              className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-5 transition-all focus-visible:ring-2 focus-visible:ring-[#d4a96a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#5c2a0e] ${
                locked
                  ? "cursor-not-allowed border-[#4a2210] bg-[#2a1208]/60 opacity-50"
                  : isStarting
                  ? "border-[#d4a96a] bg-[#d4a96a]/20 scale-95"
                  : "border-[#6b3520] bg-[#3d1a0a]/70 hover:border-[#d4a96a] hover:bg-[#3d1a0a]"
              }`}
            >
              <div className="h-16 w-16 rounded-xl bg-[#5c2a0e] border border-[#6b3520] flex items-center justify-center">
                <span className="text-2xl select-none">{modeEmoji(key)}</span>
              </div>
              <span className="font-semibold text-[#f5e6c8] text-sm">{label}</span>
              {locked && !modes.posttestRequired && (
                <span className="text-[#9a7850] text-[0.65rem] text-center leading-tight">
                  {unlocksAt ? `Unlocks ${unlocksAt}` : "Locked"}
                </span>
              )}
              {isStarting && (
                <span className="text-[#d4a96a] text-xs animate-pulse">Starting…</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function modeEmoji(key: string) {
  switch (key) {
    case "bacteria": return "🦠";
    case "parasite": return "🪱";
    case "fungi": return "🍄";
    case "virus": return "🧬";
    default: return "❓";
  }
}
