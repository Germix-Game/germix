"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MenuButtons } from "@/components/menu/MenuButtons";
import { createClient } from "@/utils/supabase/client";
import { HOME_CRITICAL_ASSETS } from "@/lib/preload-images";
import { PostTestPopup } from "@/components/menu/PostTestPopup";
import { SettingsModal } from "@/components/menu/SettingsModal";
import { getMotionPreference } from "@/lib/motion-preference";

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
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setMotionEnabled(getMotionPreference());
    });

    return () => window.cancelAnimationFrame(frameId);
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

  return (
    <>
      {/* Main content */}
      <div
        className={`relative h-screen w-screen overflow-hidden bg-cover bg-center ${motionEnabled ? "" : "home-motion-off"}`}
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
                  animation: loaded && motionEnabled
                    ? `${card.float} ${card.dur}ms ease-in-out ${card.delay + 600}ms infinite both`
                    : "none",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.src}
                  alt=""
                  aria-hidden="true"
                  style={{
                    width: `clamp(90px, ${((card.width ?? 190) / 1280) * 100}vw, ${card.width ?? 190}px)`,
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

        {/* Username chip — pinned to top-left */}
        {username && (
          <div
            className="absolute safe-top safe-left z-20"
            style={{
              animation: loaded ? "menu-fade-in 600ms ease-out 500ms both" : "none",
            }}
          >
            <div className="flex h-11 items-center gap-2 rounded-lg border border-[#d4a96a] bg-[#1a0a04]/80 px-4 text-sm font-semibold tracking-wide text-[#f5e6c8] shadow select-none">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4a96a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
              <span>{username}</span>
            </div>
          </div>
        )}

        {/* Settings icon + logout — pinned to top-right */}
        {username && (
          <div
            className="absolute safe-top safe-right z-20 flex items-center gap-2"
            style={{
              animation: loaded ? "menu-fade-in 600ms ease-out 500ms both" : "none",
            }}
          >
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
              aria-haspopup="dialog"
              title="Settings"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#d4a96a] bg-[#1a0a04]/80 text-[#f5e6c8] shadow transition-colors hover:bg-[#3d1a0a]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex h-11 items-center gap-2 rounded-lg border border-[#6b3520] bg-[#1a0a04]/80 px-4 text-sm font-semibold tracking-wide text-[#c8873a] shadow transition-colors hover:border-[#c8873a] hover:text-[#f5e6c8] disabled:cursor-not-allowed disabled:opacity-50"
              title="Log out"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>{loggingOut ? "..." : "Logout"}</span>
            </button>
          </div>
        )}

        {/* Menu button group + POST TEST below */}
        <div
          className="home-menu-cluster absolute left-1/2 z-10 flex flex-col items-center gap-3"
          style={{
            top: "75%",
            transform: "translate(-50%, -50%)",
            animation: loaded ? "menu-fade-in 600ms ease-out 500ms both" : "none",
          }}
        >
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

        {showSettings && (
          <SettingsModal
            motionEnabled={motionEnabled}
            onMotionToggle={setMotionEnabled}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    </>
  );
}
