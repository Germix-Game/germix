"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Alice } from "next/font/google";

const alice = Alice({ weight: "400", subsets: ["latin"] });

type RankedPlayer = {
  rank: number;
  username: string;
  totalScore: number;
  gamesPlayed: number;
};

type LeaderboardData = {
  top5: RankedPlayer[];
  currentPlayer: RankedPlayer | null;
};

type FetchStatus = "loading" | "ready" | "error";

const FONT = "var(--font-alice), serif";

type BarVariant = "gold" | "silver" | "bronze" | "green" | "you";

const TEXT_COLOR: Record<BarVariant, string> = {
  gold:   "#3a2000",
  silver: "#1a3060",
  bronze: "#fff0ec",
  green:  "#0a3010",
  you:    "#1a0060",
};

// Positions (%) relative to the 16:9 leaderboard_ui.png canvas
const BARS: Record<string, React.CSSProperties> = {
  gold:   { top: "45%",   left: "33%",  width: "32%",  height: "11%"  },
  silver: { top: "58%",   left: "17%",  width: "32%",  height: "9.5%" },
  bronze: { top: "58%",   left: "50%",  width: "32%",  height: "9.5%" },
  green1: { top: "70%",   left: "20%",  width: "60%",  height: "8%"   },
  green2: { top: "78.75%",   left: "20%",  width: "60%",  height: "8%"   },
  you:    { top: "87%",   left: "20%",  width: "60%",  height: "8%"   },
};

type TextSlot = {
  rank:     React.CSSProperties;
  username: React.CSSProperties;
  score:    React.CSSProperties;
};

const BAR_TEXT: Record<string, TextSlot> = {
  gold: {
    rank:     { left: "5%",  top: "50%", transform: "translateY(-50%)" },
    username: { left: "50%", top: "50%", transform: "translate(-50%, -50%)" },
    score:    { right: "5%", top: "50%", transform: "translateY(-50%)" },
  },
  silver: {
    rank:     { left: "5%",  top: "50%", transform: "translateY(-50%)" },
    username: { left: "50%", top: "50%", transform: "translate(-50%, -50%)" },
    score:    { right: "5%", top: "50%", transform: "translateY(-50%)" },
  },
  bronze: {
    rank:     { left: "5%",  top: "50%", transform: "translateY(-50%)" },
    username: { left: "50%", top: "50%", transform: "translate(-50%, -50%)" },
    score:    { right: "5%", top: "50%", transform: "translateY(-50%)" },
  },
  green1: {
    rank:     { left: "2%",  top: "50%", transform: "translateY(-50%)" },
    username: { left: "50%", top: "50%", transform: "translate(-50%, -50%)" },
    score:    { right: "2%", top: "50%", transform: "translateY(-50%)" },
  },
  green2: {
    rank:     { left: "2%",  top: "50%", transform: "translateY(-50%)" },
    username: { left: "50%", top: "50%", transform: "translate(-50%, -50%)" },
    score:    { right: "2%", top: "50%", transform: "translateY(-50%)" },
  },
  you: {
    rank:     { left: "2%",  top: "50%", transform: "translateY(-50%)" },
    username: { left: "50%", top: "50%", transform: "translate(-50%, -50%)" },
    score:    { right: "2%", top: "50%", transform: "translateY(-50%)" },
  },
};

const BAR_KEYS = ["gold", "silver", "bronze", "green1", "green2"] as const;

function variantForIndex(i: number): BarVariant {
  if (i === 0) return "gold";
  if (i === 1) return "silver";
  if (i === 2) return "bronze";
  return "green";
}

function BarRow({
  rank,
  username,
  totalScore,
  barKey,
  variant,
  isYou,
}: {
  rank: number;
  username: string;
  totalScore: number;
  barKey: string;
  variant: BarVariant;
  isYou?: boolean;
}) {
  const color = TEXT_COLOR[variant];
  const pos = BAR_TEXT[barKey];
  const textBase: React.CSSProperties = {
    position: "absolute",
    fontFamily: FONT,
    color,
    fontSize: "clamp(8px, 1.4vw, 18px)",
    userSelect: "none",
    pointerEvents: "none",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <span style={{ ...textBase, ...pos.rank }}>
        #{rank}
      </span>
      <span style={{ ...textBase, ...pos.username, overflow: "hidden", textOverflow: "ellipsis", maxWidth: "45%" }}>
        {isYou ? `▶ ${username}` : username}
      </span>
      <span style={{ ...textBase, ...pos.score }}>
        {totalScore.toLocaleString()}
      </span>
    </div>
  );
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [status, setStatus] = useState<FetchStatus>("loading");

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json() as Promise<LeaderboardData>;
      })
      .then((d) => {
        setData(d);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  const top5 = data?.top5 ?? [];
  const currentPlayer = data?.currentPlayer ?? null;

  return (
    <div
      className={`${alice.className} fixed inset-0`}
      style={{
        backgroundImage: "url('/assets/backgrounds/main_page_background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/assets/leaderboard/leaderboard_bg.png')",
          backgroundSize: "auto 100%",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      />
      <Link
        href="/home"
        className="absolute top-4 left-4 z-20 rounded-lg border px-4 py-2 text-sm font-medium"
        style={{
          background: "rgba(42,20,0,0.9)",
          borderColor: "rgba(122,64,16,0.8)",
          color: "#c8a060",
          fontFamily: "Arial, sans-serif",
        }}
      >
        ← Back
      </Link>

      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative"
          style={{
            height: "min(100vh, calc(100vw * 9 / 16))",
            aspectRatio: "16 / 9",
          }}
        >
          <Image
            src="/assets/leaderboard/leaderboard_ui.png"
            alt=""
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "fill" }}
            draggable={false}
          />

          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div
                className="h-8 w-8 rounded-full border-4 animate-spin"
                style={{ borderColor: "#c8a060 transparent #c8a060 #c8a060" }}
              />
            </div>
          )}

          {status === "error" && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <p style={{ color: "#9a3030", fontFamily: FONT }}>
                Failed to load scores.
              </p>
            </div>
          )}

          {status === "ready" && (
            <>
              {top5.map((player, i) => {
                const barKey = BAR_KEYS[i];
                const variant = variantForIndex(i);
                const isYou = currentPlayer?.username === player.username;
                return (
                  <div key={player.username} style={{ position: "absolute", zIndex: 10, ...BARS[barKey] }}>
                    <BarRow
                      rank={player.rank}
                      username={player.username}
                      totalScore={player.totalScore}
                      barKey={barKey}
                      variant={variant}
                      isYou={isYou}
                    />
                  </div>
                );
              })}

              {currentPlayer && !top5.some((p) => p.username === currentPlayer.username) && (
                <div style={{ position: "absolute", zIndex: 10, ...BARS.you }}>
                  <BarRow
                    rank={currentPlayer.rank}
                    username={currentPlayer.username}
                    totalScore={currentPlayer.totalScore}
                    barKey="you"
                    variant="you"
                    isYou
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
