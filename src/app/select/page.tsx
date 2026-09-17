"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LevelSelectPage() {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/game-modes")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (data.posttestRequired) {
          router.push("/home");
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        setChecking(false);
      });
  }, [router]);

  function handleSelect(gameMode: string) {
    if (starting) return;
    setStarting(true);
    // Navigate immediately — /play's own loading screen creates the session
    // and fetches the first round, so the player waits there instead of here.
    router.push(`/play?mode=${gameMode}`);
  }

  if (checking) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#2a1208]">
        <span className="text-[#f5e6c8] text-lg font-semibold animate-pulse">Loading...</span>
      </div>
    );
  }


  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: "url('/assets/backgrounds/main_page_background.webp')" }}
    >
      <div
        className="select-stage absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "min(100vw, calc(100vh * 16 / 9))",
          height: "min(100vh, calc(100vw * 9 / 16))",
        }}
      >

        <img
          src="/assets/game-selection/germix-graphic-game-29.webp"
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
        />

        {/* Bacteria — top-left slot */}
        <div className="select-bacteria-card absolute" style={{ left: "24%", top: "calc(50% - 24%)", width: "45.44%", transform: "translate(-52.1%, -52.7%)" }}>
          <img
            src="/assets/game-selection/bateria_level.webp"
            alt="Bacteria"
            draggable={false}
            onClick={() => handleSelect("BACTERIA")}
            className={`w-full select-none transition-transform duration-200 ${
              starting ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:scale-105"
            }`}
          />
        </div>

        {/* Virus — top-right slot (locked) */}
        <div className="select-virus-card absolute" style={{ left: "70%", top: "calc(50% - 24%)", width: "28.45%", transform: "translate(-45.9%, -56.5%)" }}>
          <img
            src="/assets/game-selection/virus_select.webp"
            alt="Virus — locked, coming soon"
            draggable={false}
            className="w-full select-none cursor-not-allowed transition-transform duration-200 hover:scale-105"
          />
        </div>

        {/* Fungi — bottom-left slot (locked) */}
        <div className="select-fungi-card absolute" style={{ left: "25%", top: "calc(50% + 21.5%)", width: "27.01%", transform: "translate(-53.1%, -47.9%)" }}>
          <img
            src="/assets/game-selection/fungi_select.webp"
            alt="Fungi — locked, coming soon"
            draggable={false}
            className="w-full select-none cursor-not-allowed transition-transform duration-200 hover:scale-105"
          />
        </div>

        {/* Parasite — bottom-right slot */}
        <div className="select-parasite-card absolute" style={{ left: "71%", top: "calc(50% + 20%)", width: "45.22%", transform: "translate(-46.7%, -46.2%)" }}>
          <img
            src="/assets/game-selection/parasite_level.webp"
            alt="Parasites"
            draggable={false}
            onClick={() => handleSelect("PARASITE")}
            className={`w-full select-none transition-transform duration-200 ${
              starting ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:scale-105"
            }`}
          />
        </div>
      </div>

      {/* Back button — top-left */}
      <button
        onClick={() => router.push("/home")}
        className="tap-min safe-top safe-left absolute rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
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
