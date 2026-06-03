"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { MenuButtons } from "@/components/menu/MenuButtons";

// ─── Card layout data ─────────────────────────────────────────────────────────
// Positions are percentages of the 1280×720 reference canvas used in the original
// Phaser scene (x/1280, y/720). Each card is centered at its (left, top) point.

const B = (n: number) => `/assets/cards/Answer%20Cards/Bacteria%20Cards/${n}.png`;
const P = (n: number) => `/assets/cards/Answer%20Cards/Parasite%20Card/${n}.png`;

type FloatSize = "card-float-sm" | "card-float-md" | "card-float-lg";

type CardDef = {
  src: string;
  left: string;
  top: string;
  rotate: number;
  float: FloatSize;
  dur: number;
  delay: number;
  width?: number;
};
const CARDS: CardDef[] = [
  // ── Top-Left Cluster ───────────────────────────────────────────────────────
  { src: P(89), left: "5%",   top: "10%",   rotate: -25, float: "card-float-md", dur: 2500, delay: 0 },     // Leishmania spp. (Fly)
  { src: P(78), left: "14%",  top: "12%",  rotate: 15,  float: "card-float-sm", dur: 2900, delay: 200 },   // W. bancrofti (Globe)
  { src: B(66), left: "2%",   top: "35%",  rotate: -35, float: "card-float-lg", dur: 2300, delay: 400 },   // C. trachomatis (White cell)
  { src: B(13), left: "20%",  top: "35%",  rotate: 10,  float: "card-float-md", dur: 2400, delay: 600 },   // S. aureus (Purple cluster)

  // ── Mid-Left Cluster ───────────────────────────────────────────────────────
  { src: B(29), left: "16%",  top: "55%",  rotate: 5,   float: "card-float-sm", dur: 2800, delay: 800 },   // M. tuberculosis
  { src: B(37), left: "6%",   top: "65%",  rotate: -20, float: "card-float-lg", dur: 2200, delay: 1000 },  // N. gonorrhoeae (Pink twins)
  { src: B(50), left: "26%",  top: "65%",  rotate: 15,  float: "card-float-md", dur: 2450, delay: 1200 },  // B. pseudomallei (Hat)

  // ── Bottom-Left Cluster ────────────────────────────────────────────────────
  { src: P(82), left: "1%",   top: "88%",  rotate: -15, float: "card-float-md", dur: 2500, delay: 1400 },  // O. tsutsugamushi (Orange bug)
  { src: B(18), left: "14%",  top: "85%",  rotate: -5,  float: "card-float-lg", dur: 2900, delay: 1600 },  // P. falciparum (Purple pot)
  { src: P(104), left: "25%",  top: "92%",  rotate: 5,   float: "card-float-sm", dur: 2300, delay: 1800 },  // T. saginata (Dog worm)

  // ── Top-Right Cluster ──────────────────────────────────────────────────────
  { src: B(21), left: "80%",  top: "12%",  rotate: 15,  float: "card-float-md", dur: 2400, delay: 100 },   // S. pneumoniae (Purple pair)
  { src: P(108), left: "95%",  top: "15%",  rotate: -10, float: "card-float-lg", dur: 2800, delay: 300 },   // E. vermicularis (Brown oval)

  // ── Mid-Right Cluster ──────────────────────────────────────────────────────
  { src: B(61), left: "78%",  top: "38%",  rotate: 0,   float: "card-float-lg", dur: 2200, delay: 500 },   // T. pallidum (White squiggly)
  { src: P(90), left: "88%",  top: "35%",  rotate: -5,  float: "card-float-md", dur: 2450, delay: 700 },   // E. histolytica (Brown poop)
  { src: B(35), left: "74%",  top: "62%",  rotate: -5,  float: "card-float-sm", dur: 2600, delay: 900 },   // C. perfringens (Gas mask)
  { src: B(36), left: "85%",  top: "60%",  rotate: 5,   float: "card-float-lg", dur: 2350, delay: 1100 },  // P. aeruginosa (Pink pill)
  { src: P(103), left: "95%",  top: "60%",  rotate: 15,  float: "card-float-lg", dur: 2800, delay: 1300 },  // S. japonicum (Blood fluke)

  // ── Bottom-Right Cluster ───────────────────────────────────────────────────
  { src: P(95), left: "76%",  top: "88%",  rotate: -15, float: "card-float-sm", dur: 2200, delay: 1500 },  // S. stercoralis (Muscle worm)
  { src: P(96), left: "85%",  top: "85%",  rotate: -20, float: "card-float-lg", dur: 2550, delay: 1700 },  // P. westermani (Lung fluke)
  { src: P(98), left: "95%",  top: "92%",  rotate: 25,  float: "card-float-md", dur: 2700, delay: 1900 },  // C. belli (Red eyes poop)
];

const PRELOAD_ASSETS = [
  "/assets/backgrounds/main_page_background.png",
  "/assets/ui/game-logo.png",
  "/assets/ui/main-page-element-bg.png",
  ...CARDS.map((c) => c.src),
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      PRELOAD_ASSETS.map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new window.Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = src;
          })
      )
    ).then(() => {
      if (!cancelled) setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {/* Loading screen — fades out once all assets are ready */}
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0d0500]"
        style={{
          opacity: loaded ? 0 : 1,
          pointerEvents: loaded ? "none" : "all",
          transition: "opacity 700ms ease",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/ui/game-logo.png"
          alt="Germix"
          draggable={false}
          style={{ width: "260px", marginBottom: "2rem", opacity: 0.9 }}
        />
        <div style={{ display: "flex", gap: "8px" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#c8873a",
                animation: `loading-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Main content — rendered immediately so images load in the background */}
      <div
        className="relative h-screen w-screen overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/backgrounds/main_page_background.png')" }}
      >
        {/* Scattered floating card decorations */}
        {CARDS.map((card, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: card.left,
              top: card.top,
              transform: `translate(-50%, -50%) rotate(${card.rotate}deg)`,
              animation: loaded
                ? `menu-fade-in 500ms ease-in ${card.delay + 80}ms both`
                : "none",
            }}
          >
            <div className="menu-bg-card">
              <div
                style={{
                  animation: loaded
                    ? `${card.float} ${card.dur}ms ease-in-out ${card.delay + 600}ms infinite both`
                    : "none",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.src}
                  alt=""
                  aria-hidden="true"
                  width={card.width ?? 150}
                  style={{
                    filter:
                      "drop-shadow(4px 8px 14px rgba(0,0,0,0.65)) drop-shadow(1px 2px 4px rgba(0,0,0,0.40))",
                  }}
                  draggable={false}
                />
              </div>
            </div>
          </div>
        ))}

        {/* Parchment element — sits behind the logo at the bottom-centre */}
        <div
          className="absolute left-1/2 pointer-events-none"
          style={{
            top: "95%",
            width: "44%",
            transform: "translate(-50%, -50%)",
            opacity: 0.88,
            animation: loaded ? "menu-fade-in 650ms ease-out 200ms both" : "none",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/ui/main-page-element-bg.png"
            alt=""
            aria-hidden="true"
            className="w-full"
            draggable={false}
          />
        </div>

        {/* GERMIX logo — centred at 27% height */}
        <div
          className="absolute left-1/2 pointer-events-none"
          style={{
            top: "27%",
            width: "50%",
            transform: "translate(-50%, -50%)",
            animation: loaded ? "menu-fade-in 650ms ease-out 200ms both" : "none",
          }}
        >
          <Image
            src="/assets/ui/game-logo.png"
            alt="Germix — Microbiology Card Game"
            width={800}
            height={300}
            className="w-full h-auto"
            priority
          />
        </div>

        {/* POST TEST — locked, pinned to top-right */}
        <div
          className="absolute top-4 right-4 z-20"
          style={{
            animation: loaded ? "menu-fade-in 600ms ease-out 500ms both" : "none",
          }}
        >
          <div
            className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[#6b3520] bg-[#1a0a04]/80 px-3 text-xs font-semibold tracking-wide text-[#6b5040] shadow cursor-not-allowed select-none"
            aria-disabled="true"
            title="Post test is not yet available"
          >
            <span>🔒</span>
            <span>POST TEST</span>
          </div>
        </div>

        {/* Menu button group */}
        <div
          className="absolute left-1/2 z-10"
          style={{
            top: "75%",
            transform: "translate(-50%, -50%)",
            animation: loaded ? "menu-fade-in 600ms ease-out 500ms both" : "none",
          }}
        >
          <MenuButtons />
        </div>
      </div>
    </>
  );
}
