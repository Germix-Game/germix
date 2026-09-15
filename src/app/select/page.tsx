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
      {/* ── STAGE ──────────────────────────────────────────────────────────
          A 16:9 box, centred, sized exactly the way `object-fit: contain`
          sizes the artwork (both are 1920x1080). Everything that belongs
          *on* the artwork lives inside and is positioned in % of the stage,
          so squishing the window shrinks it toward the middle and the cards
          come with it — instead of staying pinned to the viewport edges.

          Because the stage normalises aspect ratio, the per-device
          positional tuning that used to live in globals.css is no longer
          needed: every viewport now gets the same 16:9 layout, just scaled.
          Only the size bumps for touch devices remain there. ──────────── */}
      <div
        className="select-stage absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "min(100vw, calc(100vh * 16 / 9))",
          height: "min(100vh, calc(100vw * 9 / 16))",
        }}
      >
        {/* Background artwork — fills the stage exactly */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/game-selection/germix-graphic-game-29.webp"
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
        />

        {/* ── QUADRANTS ──────────────────────────────────────────────────
            The stage splits 2x2 and each selection centres in its own cell:

              top-left  Bacteria   |   top-right  Virus  (locked)
              bottom-left Fungi    |   bottom-right Parasite

            Each card's visible circle badge sits off-centre inside its own
            transparent canvas (to leave room for the curved label text), by
            a different amount per asset. Flex-centring would align the four
            *bounding boxes*, not the four circles — so each card carries a
            nudge wrapper that shifts it by (50% - circleCentre), putting the
            visible dish on the quadrant centre. Dish centres, measured by
            eroding each asset's alpha until only the solid dish survives
            (thin label strokes disappear), as % of its own width/height:
              bacteria (52.1, 52.7)   fungi    (53.1, 47.9)
              virus    (45.9, 56.5)   parasite (46.7, 46.2)

            Widths are % of a quadrant (half the stage) and are tuned so all
            four *dish circles* render at the same diameter — the raw frames
            differ a lot: the dish fills ~47% of Bacteria/Parasite's 1920x1080
            canvas but ~75-79% of Fungi/Virus's smaller square ones.
            Recompute both the nudges and the widths if any asset is swapped
            for art with different internal padding. ─────────────────── */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          {/* Q1 top-left — Bacteria */}
          <div className="flex items-center justify-center">
            <div className="flex w-full items-center justify-center" style={{ transform: "translate(-2.1%, -2.7%)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/game-selection/bateria_level.webp"
                alt="Bacteria"
                draggable={false}
                onClick={() => handleSelect("BACTERIA")}
                className={`select-bacteria-card w-[90.88%]  object-contain select-none transition-transform duration-200 ${
                  starting ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:scale-105"
                }`}
              />
            </div>
          </div>

          {/* Q2 top-right — Virus (locked) */}
          <div className="flex items-center justify-center">
            <div className="flex w-full items-center justify-center" style={{ transform: "translate(4.1%, -6.5%)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/game-selection/virus_select.webp"
                alt="Virus — locked, coming soon"
                draggable={false}
                className="select-virus-card w-[56.9%]  object-contain select-none cursor-not-allowed transition-transform duration-200 hover:scale-105"
              />
            </div>
          </div>

          {/* Q3 bottom-left — Fungi (locked) */}
          <div className="flex items-center justify-center">
            <div className="flex w-full items-center justify-center" style={{ transform: "translate(-3.1%, 2.1%)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/game-selection/fungi_select.webp"
                alt="Fungi — locked, coming soon"
                draggable={false}
                className="select-fungi-card w-[54.02%]  object-contain select-none cursor-not-allowed transition-transform duration-200 hover:scale-105"
              />
            </div>
          </div>

          {/* Q4 bottom-right — Parasite */}
          <div className="flex items-center justify-center">
            <div className="flex w-full items-center justify-center" style={{ transform: "translate(3.3%, 3.8%)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/game-selection/parasite_level.webp"
                alt="Parasites"
                draggable={false}
                onClick={() => handleSelect("PARASITE")}
                className={`select-parasite-card w-[90.43%]  object-contain select-none transition-transform duration-200 ${
                  starting ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:scale-105"
                }`}
              />
            </div>
          </div>
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
