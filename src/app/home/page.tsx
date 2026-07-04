"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MenuButtons } from "@/components/menu/MenuButtons";
import { createClient } from "@/utils/supabase/client";
import { HOME_CRITICAL_ASSETS } from "@/lib/preload-images";
import { PostTestPopup } from "@/components/menu/PostTestPopup";

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
  ...HOME_CRITICAL_ASSETS,
  ...CARDS.map((c) => c.src),
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [loaded, setLoaded] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  const [posttestRequired, setPosttestRequired] = useState(false);
  const [posttestPeriod, setPosttestPeriod] = useState<string | null>(null);
  const [posttestEnabled, setPosttestEnabled] = useState(false);
  const [showPosttestPopup, setShowPosttestPopup] = useState(false);

  useEffect(() => {
    fetch("/api/game-modes")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setPosttestRequired(!!data.posttestRequired);
        if (data.posttest) {
          setPosttestEnabled(true);
          setPosttestPeriod(data.posttest.period);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const raw = data.user.user_metadata?.username as string | undefined;
        setUsername(raw ?? data.user.email?.split("@")[0] ?? null);
      }
    });
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

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

  const menuAnim = loaded ? "menu-fade-in 600ms ease-out 400ms both" : "none";

  const menuContent = (
    <>
      <MenuButtons
        posttestRequired={posttestRequired}
        onPlayClick={() => setShowPosttestPopup(true)}
      />
      {posttestEnabled && posttestRequired && (
        <button
          onClick={() => setShowPosttestPopup(true)}
          className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[#d4a96a] bg-[#1a0a04]/80 px-4 text-xs font-semibold tracking-wide text-[#f5e6c8] shadow hover:bg-[#3d1a0a] transition-colors cursor-pointer select-none"
          title="Complete the post-test"
        >
          <span>📝</span>
          <span>POST TEST {posttestPeriod ? `(${posttestPeriod})` : ""}</span>
        </button>
      )}
    </>
  );

  return (
    <>
      <div
        className="relative h-screen w-screen overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/backgrounds/main_page_background.png')" }}
      >
        {/* Floating card decorations — only on wide desktop screens */}
        {CARDS.map((card, i) => (
          <div
            key={i}
            className="absolute hidden lg:block"
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

        {/* Parchment element — desktop only */}
        <div
          className="absolute left-1/2 pointer-events-none hidden lg:block"
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

        {/* Top bar: username left, logout right */}
        <div
          className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-3 sm:p-4"
          style={{ animation: loaded ? "menu-fade-in 600ms ease-out 500ms both" : "none" }}
        >
          {username ? (
            <div className="flex h-10 items-center gap-2 rounded-lg border border-[#d4a96a] bg-[#1a0a04]/80 px-3 text-sm font-semibold tracking-wide text-[#f5e6c8] shadow select-none max-w-[45vw] overflow-hidden">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d4a96a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
              <span className="truncate">{username}</span>
            </div>
          ) : <div />}
          {username && (
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex h-10 items-center gap-2 rounded-lg border border-[#6b3520] bg-[#1a0a04]/80 px-3 text-sm font-semibold tracking-wide text-[#c8873a] shadow transition-colors hover:border-[#c8873a] hover:text-[#f5e6c8] disabled:opacity-50 disabled:cursor-not-allowed"
              title="Log out"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>{loggingOut ? "..." : "Logout"}</span>
            </button>
          )}
        </div>

        {/* ── PORTRAIT / TALL layout: logo above, menu below, vertically centred ── */}
        <div
          className="absolute inset-0 [@media(max-height:500px)]:hidden flex flex-col items-center justify-center gap-4 sm:gap-6 z-10 px-6 pt-14 pb-6 overflow-y-auto"
          style={{ animation: menuAnim }}
        >
          <Image
            src="/assets/ui/game-logo.png"
            alt="Germix — Microbiology Card Game"
            width={800}
            height={300}
            className="w-[min(440px,76vw)] h-auto pointer-events-none drop-shadow-[2px_4px_10px_rgba(0,0,0,0.6)]"
            priority
          />
          <div className="flex flex-col items-center gap-3 w-full max-w-xs">
            {menuContent}
          </div>
        </div>

        {/* ── LANDSCAPE PHONE layout: logo left, menu right ── */}
        <div
          className="absolute inset-0 hidden [@media(max-height:500px)]:flex items-center justify-center gap-6 z-10 px-6 pt-12 pb-3"
          style={{ animation: menuAnim }}
        >
          <Image
            src="/assets/ui/game-logo.png"
            alt="Germix — Microbiology Card Game"
            width={800}
            height={300}
            className="w-[28vw] h-auto pointer-events-none shrink-0 drop-shadow-[2px_4px_10px_rgba(0,0,0,0.6)]"
            priority
          />
          <div className="flex flex-col items-center gap-2 shrink-0">
            {menuContent}
          </div>
        </div>

        {showPosttestPopup && posttestPeriod && (
          <PostTestPopup
            period={posttestPeriod}
            onComplete={() => {
              setPosttestRequired(false);
            }}
            onClose={() => setShowPosttestPopup(false)}
          />
        )}
      </div>
    </>
  );
}
