"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LevelSelectPage() {
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  async function handleSelect(gameMode: string) {
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
        src="/assets/Game selection/Germix graphic game - 26.png"
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
        src="/assets/Game selection/bateria_level.png"
        alt="Bacteria"
        draggable={false}
        onClick={() => handleSelect("BACTERIA")}
        className={`absolute select-none transition-transform duration-200 ${
          starting ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:scale-105"
        }`}
        style={{ top: "2%", left: "12%", width: "37vw" }}
      />

      {/* Parasite level button — bottom-right (locked) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/Game selection/parasite_level.png"
        alt="Parasites"
        draggable={false}
        className="absolute select-none cursor-not-allowed grayscale opacity-50 transition-transform duration-200"
        style={{ bottom: "2%", right: "12%", width: "37vw" }}
      />

      {/* Back button — top-left */}
      <button
        onClick={() => router.push("/")}
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
