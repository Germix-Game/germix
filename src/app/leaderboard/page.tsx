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

const PODIUM_TEXT_COLOR = ["#7a4500", "#1a3060", "#000000"];
const GREEN_TEXT_COLOR = "#0a3010";

// Bar rectangles as % of leaderboard_ui.png (1223x443), in rank order.
const PODIUM_BARS: React.CSSProperties[] = [
  { left: "24.5%", top: "42.4%", width: "51.1%", height: "24.6%" },
  { left: "1.5%", top: "70%", width: "48.2%", height: "24.8%" },
  { left: "50.9%", top: "70%", width: "48.1%", height: "24.8%" },
];

function RowText({
  rank,
  username,
  totalScore,
  color,
  fontSize,
  inset,
  glow,
}: {
  rank: number;
  username: string;
  totalScore: number;
  color: string;
  fontSize: string;
  inset: string;
  glow?: boolean;
}) {
  const base: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    fontFamily: FONT,
    color,
    fontSize,
    userSelect: "none",
    pointerEvents: "none",
    whiteSpace: "nowrap",
    ...(glow && {
      textShadow: "0 1px 6px rgba(255,200,60,0.7), 0 0 2px rgba(255,220,80,0.5)",
    }),
  };

  return (
    <>
      <span style={{ ...base, left: inset }}>#{rank}</span>
      <span
        style={{
          ...base,
          left: "50%",
          transform: "translate(-50%, -50%)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "48%",
        }}
      >
        {username}
      </span>
      <span style={{ ...base, right: inset }}>{totalScore.toLocaleString()}</span>
    </>
  );
}

function GreenBar({
  player,
  pullUp,
  sticky,
}: {
  player: RankedPlayer;
  pullUp: boolean;
  sticky?: boolean;
}) {
  return (
    <div
      style={{
        position: sticky ? "sticky" : "relative",
        ...(sticky && { bottom: 0, zIndex: 5 }),
        width: "100%",
        aspectRatio: "1198 / 117",
        // greenbar.png carries ~20px transparent padding top and bottom;
        // pull rows together to cancel it (% margin resolves against width).
        marginTop: pullUp ? "-2.9%" : 0,
      }}
    >
      <Image
        src="/assets/Leaderboard/greenbar.png"
        alt=""
        fill
        sizes="(max-width: 1500px) 67vw, 1005px"
        style={{ objectFit: "fill" }}
        draggable={false}
      />
      <RowText
        rank={player.rank}
        username={player.username}
        totalScore={player.totalScore}
        color={GREEN_TEXT_COLOR}
        fontSize="clamp(10px, 1.15vw, 22px)"
        inset="3%"
      />
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

  const players = data?.top5 ?? [];
  const podium = players.slice(0, 3);
  const rest = players.slice(3);
  const currentPlayer = data?.currentPlayer ?? null;

  return (
    <div className={`${alice.className} relative min-h-screen w-full font-bold`}>
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: "url('/assets/backgrounds/main_page_background.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <Link
        href="/home"
        className="fixed left-4 top-4 z-20 flex h-9 items-center rounded-lg border border-[#d4a96a] bg-[#2a1208]/80 px-4 text-sm font-semibold text-[#f5e6c8] transition-colors hover:bg-[#3d1a0a]"
      >
        ← Back
      </Link>

      <div className="mx-auto w-full" style={{ maxWidth: 1500 }}>
        {/* Top of the tablet: title art + podium for ranks 1-3 */}
        <section
          className="relative w-full"
          style={{
            aspectRatio: "1920 / 1080",
            backgroundImage: "url('/assets/Leaderboard/leaderboard_bg.png')",
            backgroundSize: "100% 100%",
          }}
        >
          {status === "error" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p style={{ color: "#9a3030", fontFamily: FONT }}>Failed to load scores.</p>
            </div>
          )}

          {status === "ready" && (
            <div
              className="absolute"
              style={{
                left: "50%",
                transform: "translateX(-50%)",
                top: "33%",
                width: "63.7%",
                aspectRatio: "1223 / 443",
              }}
            >
              <Image
                src="/assets/Leaderboard/leaderboard_ui.png"
                alt=""
                fill
                priority
                sizes="(max-width: 1500px) 64vw, 956px"
                style={{ objectFit: "fill" }}
                draggable={false}
              />

              {podium.map((player, i) => (
                <div key={player.username} style={{ position: "absolute", ...PODIUM_BARS[i] }}>
                  <RowText
                    rank={player.rank}
                    username={player.username}
                    totalScore={player.totalScore}
                    color={PODIUM_TEXT_COLOR[i]}
                    fontSize={i === 0 ? "clamp(12px, 1.5vw, 28px)" : "clamp(10px, 1.15vw, 22px)"}
                    inset="5%"
                    glow={i === 0}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Bottom of the tablet: one green bar per remaining player */}
        <section
          className="relative w-full"
          style={{
            marginTop: "-15.5%",
            paddingTop: "0%",
            paddingBottom: "22%",
          }}
        >
          {/* Flipped vertically so the tablet's frame closes at the bottom and
              the cream screen continues seamlessly from the section above. */}
          <Image
            src="/assets/Leaderboard/leaderboard_bg_bottom.png"
            alt=""
            fill
            sizes="(max-width: 1500px) 100vw, 1500px"
            style={{ objectFit: "fill", transform: "scaleY(-1)", zIndex: 0 }}
            draggable={false}
          />

          <div
            style={{
              position: "relative",
              zIndex: 1,
              width: "67%",
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {rest.map((player, i) => (
              <GreenBar key={`${player.username}-${i}`} player={player} pullUp={i > 0} />
            ))}

            {currentPlayer && (
              <GreenBar player={currentPlayer} pullUp={rest.length > 0} sticky />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
