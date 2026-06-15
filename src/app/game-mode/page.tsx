"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ModeEntry {
  mode: string;
  locked: boolean;
  unlocksAt?: string | null;
}

interface GameModesResponse {
  posttestRequired: boolean;
  modes: ModeEntry[];
}

const MODES: { apiValue: string; label: string }[] = [
  { apiValue: "BACTERIA", label: "Bacteria" },
  { apiValue: "PARASITE", label: "Parasite" },
  { apiValue: "FUNGI", label: "Fungi" },
  { apiValue: "VIRUS", label: "Virus" },
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

  return (
    <div
      className="flex min-h-screen w-screen flex-col items-center justify-center gap-10 px-6 py-12 bg-[#5c2a0e] bg-[url('/assets/ui/wood-bg.png')] bg-cover bg-center"
    >
      <h1 className="text-3xl font-bold text-[#d4a96a] tracking-wide">Select Game Mode</h1>

      {loadError && (
        <p className="text-[#f5e6c8] text-sm">Failed to load game modes. Please refresh.</p>
      )}

      {modes?.posttestRequired && (
        <div className="w-full max-w-xl rounded-xl border border-[#c4a870] bg-[#3d1a0a]/80 px-5 py-3 text-center text-sm text-[#f5e6c8]">
          A post-test is required before you can play again. Please complete it first.
        </div>
      )}

      <div className="grid grid-cols-2 gap-5 w-full max-w-xl sm:grid-cols-4">
        {MODES.map(({ apiValue, label }) => {
          const entry = modes?.modes.find((m) => m.mode === apiValue);
          const locked = !modes || !entry || entry.locked || !!modes.posttestRequired;
          const unlocksAt =
            entry && entry.locked && entry.unlocksAt
              ? new Date(entry.unlocksAt).toLocaleDateString()
              : null;
          const isStarting = starting === apiValue;

          return (
            <button
              key={apiValue}
              disabled={locked}
              onClick={() => handleSelect(apiValue)}
              className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-5 transition-all focus-visible:ring-2 focus-visible:ring-[#d4a96a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#5c2a0e] ${
                !modes
                  ? "cursor-wait border-[#4a2210] bg-[#2a1208]/60 opacity-40"
                  : locked
                  ? "cursor-not-allowed border-[#4a2210] bg-[#2a1208]/60 opacity-50"
                  : isStarting
                  ? "border-[#d4a96a] bg-[#d4a96a]/20 scale-95"
                  : "border-[#6b3520] bg-[#3d1a0a]/70 hover:border-[#d4a96a] hover:bg-[#3d1a0a]"
              }`}
            >
              <div className="h-16 w-16 rounded-xl bg-[#5c2a0e] border border-[#6b3520] flex items-center justify-center">
                <span className="text-2xl select-none">{modeEmoji(apiValue)}</span>
              </div>
              <span className="font-semibold text-[#f5e6c8] text-sm">{label}</span>
              {modes && locked && !modes.posttestRequired && (
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

function modeEmoji(apiValue: string) {
  switch (apiValue) {
    case "BACTERIA": return "🦠";
    case "PARASITE": return "🪱";
    case "FUNGI": return "🍄";
    case "VIRUS": return "🧬";
    default: return "❓";
  }
}
