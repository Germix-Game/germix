"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { type LeaderboardPlayer } from "@/components/leaderboard/LeaderboardTable";

// TODO: REMOVE — temporary mock data for layout preview
const MOCK_PLAYERS: LeaderboardPlayer[] = [
  { username: "GermKiller99",   totalScore: 9850, gamesPlayed: 14 },
  { username: "VaccineHero",    totalScore: 8200, gamesPlayed: 12 },
  { username: "Dr.Pathogen",    totalScore: 7320, gamesPlayed: 9  },
  { username: "MicrobeSlayer",  totalScore: 5100, gamesPlayed: 7  },
  { username: "VirusHunter42",  totalScore: 3660, gamesPlayed: 5  },
  { username: "BioShieldX",     totalScore: 2940, gamesPlayed: 4  },
  { username: "NanoMedic",      totalScore: 1870, gamesPlayed: 3  },
];

type FetchStatus = "loading" | "ready" | "error";
const TOP_N = 7;
const FONT = "'Impact','Arial Black',sans-serif";

type BarVariant = "gold" | "silver" | "bronze" | "green";

const TEXT_COLOR: Record<BarVariant, string> = {
  gold:   "#3a2000",
  silver: "#1a3060",
  bronze: "#fff0ec",
  green:  "#0a3010",
};

// Positions (%) relative to the 16:9 leaderboard_ui.png canvas
const BARS: Record<string, React.CSSProperties> = {
  gold:   { top: "45%",   left: "33%",  width: "32%",  height: "11%"  },
  silver: { top: "58%",   left: "17%", width: "32%",  height: "9.5%" },
  bronze: { top: "58%",   left: "50%",  width: "32%",  height: "9.5%" },
  green1: { top: "70%", left: "20%",   width: "60%",  height: "8%"   },
  green2: {  top: "79%", left: "20%",   width: "60%",  height: "8%"    },
  green3: { top: "88%", left: "20%",   width: "60%",  height: "8%"   },
  green4: {  top: "97%", left: "20%",   width: "60%",  height: "8%"    },
};

// Positions of each text element within its bar container.
// Each slot has rank, username, and score as independent entries — adjust freely.
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
  green3: {
    rank:     { left: "2%",  top: "50%", transform: "translateY(-50%)" },
    username: { left: "50%", top: "50%", transform: "translate(-50%, -50%)" },
    score:    { right: "2%", top: "50%", transform: "translateY(-50%)" },
  },
  green4: {
    rank:     { left: "2%",  top: "50%", transform: "translateY(-50%)" },
    username: { left: "50%", top: "50%", transform: "translate(-50%, -50%)" },
    score:    { right: "2%", top: "50%", transform: "translateY(-50%)" },
  },
};

function BarRow({
  rank,
  username,
  totalScore,
  barKey,
  variant,
}: {
  rank: number;
  username: string;
  totalScore: number;
  barKey: string;
  variant: BarVariant;
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
        {username}
      </span>
      <span style={{ ...textBase, ...pos.score }}>
        {totalScore.toLocaleString()}
      </span>
    </div>
  );
}

export default function LeaderboardPage() {
  // TODO: REMOVE — replace with real fetch block once API is ready
  const [players, setPlayers] = useState<LeaderboardPlayer[]>(MOCK_PLAYERS);
  const [status, setStatus] = useState<FetchStatus>("ready");

  useEffect(() => {
    // TODO: RESTORE — uncomment to fetch real data and remove mock state above
    // fetch("/api/leaderboard")
    //   .then((res) => {
    //     if (!res.ok) throw new Error("fetch failed");
    //     return res.json() as Promise<LeaderboardPlayer[]>;
    //   })
    //   .then((data) => {
    //     setPlayers(data.slice(0, TOP_N));
    //     setStatus("ready");
    //   })
    //   .catch(() => setStatus("error"));
    void TOP_N;
  }, []);

  return (
    <div
      className="fixed inset-0"
      style={{
        backgroundImage: "url('/assets/backgrounds/main_page_background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Leaderboard bg overlay on top of the wooden base */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/assets/leaderboard/leaderboard_bg.png')",
          backgroundSize: "auto 100%",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      />
      {/* Back button */}
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

      {/* 16:9 stage — scales to fill the screen while preserving aspect ratio */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative"
          style={{
            height: "min(100vh, calc(100vw * 9 / 16))",
            aspectRatio: "16 / 9",
          }}
        >
          {/* UI bars template image */}
          <Image
            src="/assets/leaderboard/leaderboard_ui.png"
            alt=""
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "fill" }}
            draggable={false}
          />

          {/* Loading state */}
          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div
                className="h-8 w-8 rounded-full border-4 animate-spin"
                style={{ borderColor: "#c8a060 transparent #c8a060 #c8a060" }}
              />
            </div>
          )}

          {/* Error state */}
          {status === "error" && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <p style={{ color: "#9a3030", fontFamily: FONT }}>
                Failed to load scores.
              </p>
            </div>
          )}

          {/* Player text overlays */}
          {status === "ready" && (
            <>
              {players[0] && (
                <div style={{ position: "absolute", zIndex: 10, ...BARS.gold }}>
                  <BarRow rank={1} username={players[0].username} totalScore={players[0].totalScore} barKey="gold" variant="gold" />
                </div>
              )}
              {players[1] && (
                <div style={{ position: "absolute", zIndex: 10, ...BARS.silver }}>
                  <BarRow rank={2} username={players[1].username} totalScore={players[1].totalScore} barKey="silver" variant="silver" />
                </div>
              )}
              {players[2] && (
                <div style={{ position: "absolute", zIndex: 10, ...BARS.bronze }}>
                  <BarRow rank={3} username={players[2].username} totalScore={players[2].totalScore} barKey="bronze" variant="bronze" />
                </div>
              )}
              {players[3] && (
                <div style={{ position: "absolute", zIndex: 10, ...BARS.green1 }}>
                  <BarRow rank={4} username={players[3].username} totalScore={players[3].totalScore} barKey="green1" variant="green" />
                </div>
              )}
              {players[4] && (
                <div style={{ position: "absolute", zIndex: 10, ...BARS.green2 }}>
                  <BarRow rank={5} username={players[4].username} totalScore={players[4].totalScore} barKey="green2" variant="green" />
                </div>
              )}
              {players[5] && (
                <div style={{ position: "absolute", zIndex: 10, ...BARS.green3 }}>
                  <BarRow rank={6} username={players[5].username} totalScore={players[5].totalScore} barKey="green3" variant="green" />
                </div>
              )}
              {players[6] && (
                <div style={{ position: "absolute", zIndex: 10, ...BARS.green4 }}>
                  <BarRow rank={7} username={players[6].username} totalScore={players[6].totalScore} barKey="green4" variant="green" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
