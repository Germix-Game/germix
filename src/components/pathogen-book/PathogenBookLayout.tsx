"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alice } from "next/font/google";

const alice = Alice({ weight: "400", subsets: ["latin"] });

// ─── Types ────────────────────────────────────────────────────────────────────

type GramType = "POSITIVE" | "NEGATIVE" | "ACID_FAST" | "NONE" | "PROTOZOA" | "PLATYHEMINTH" | "NEMATODE";

type MicrobeEntry = {
  id: string;
  name: string;
  shortName: string;
  answerImageUrl: string;
  gramType: GramType;
  starRating: number;
  unlocked: boolean;
};

// One Pathogen Book slot. `card` is present only when the player has opened it —
// the server withholds unopened card data, so the book shows only what was revealed.
type BookSlot = {
  slotIndex: number;
  category: string;
  opened: boolean;
  card: { id: string; category: string; label: string; imageUrl: string } | null;
};

type GameMode = "BACTERIA" | "FUNGI" | "PARASITES" | "VIRUS";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// DB stores paths without the /assets/ prefix (e.g. "cards/answers/bacteria/foo.webp").
// Supabase Storage CDN URLs start with "https://". Both cases are handled here.
function resolveImageSrc(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;

  const localUrl = url.startsWith("/") ? url : `/assets/${url}`;
  return localUrl.replace(/\.png(?=$|[?#])/i, ".webp");
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: { mode: GameMode; href: string; label: string }[] = [
  { mode: "BACTERIA", href: "/pathogen-book/bacteria", label: "Bacteria" },
  { mode: "PARASITES", href: "/pathogen-book/parasite", label: "Parasite" },
  { mode: "FUNGI",    href: "/pathogen-book/fungi",    label: "Fungi"    },
  { mode: "VIRUS",    href: "/pathogen-book/virus",    label: "Virus"    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function starSrc(rating: number): string {
  const n = Math.min(5, Math.max(1, Math.round(rating * 2) / 2));
  return `/assets/pathogen-book/star-${n}.webp`;
}

// Long binomial names (e.g. "Burkholderia pseudomallei") can run wider than
// the right-page header has room for. Past 20 characters, force the break
// after the genus (first word) instead of leaving the browser to wrap
// wherever it fits, so the name always reads as two clean lines.
function formatMicrobeName(name: string) {
  if (name.length <= 20) return name;
  const firstSpace = name.indexOf(" ");
  if (firstSpace === -1) return name;
  return (
    <>
      {name.slice(0, firstSpace)}
      <br />
      {name.slice(firstSpace + 1)}
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MicrobeCard({
  microbe,
  selected,
  onClick,
}: {
  microbe: MicrobeEntry;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={microbe.unlocked ? onClick : undefined}
      disabled={!microbe.unlocked}
      aria-label={microbe.unlocked ? microbe.name : "Locked microbe"}
      className={`relative flex flex-col items-center transition-all ${
        selected ? "scale-105 ring-2 ring-[#c8873a]" : ""
      } ${!microbe.unlocked ? "cursor-default" : "cursor-pointer"}`}
    >
      {microbe.unlocked ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveImageSrc(microbe.answerImageUrl)}
            alt={microbe.name}
            className="w-full rounded-[11px] object-contain"
            style={{ aspectRatio: "1429 / 2000" }}
            draggable={false}
          />
        </>
      ) : (
        // Grid parent renders at `zoom: 0.38` — 21px here displays as ~8px.
        <div
          className="flex w-full flex-col items-center justify-center rounded-[21px]"
          style={{
            aspectRatio: "1429 / 2000",
            background: "linear-gradient(145deg, #2a1a0a 0%, #1a0e05 60%, #0f0804 100%)",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.6), inset 0 -1px 2px rgba(255,200,100,0.05)",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5a3a1a"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-2/5 opacity-60"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      )}
    </button>
  );
}

const SHIMMER_CSS = `
  @keyframes shimmer {
    0%   { background-position: -400% center; }
    100% { background-position:  400% center; }
  }
`;

function ShimmerCard({ base, sheen }: { base: string; sheen: string }) {
  return (
    <div
      className="w-full rounded-sm"
      style={{
        aspectRatio: "1429 / 2000",
        background: `linear-gradient(105deg, ${base} 42%, ${sheen} 50%, ${base} 58%)`,
        backgroundSize: "300% 100%",
        animation: "shimmer 3s linear infinite",
      }}
    />
  );
}

function MicrobeGridSkeleton() {
  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <div className="pb-microbe-grid grid grid-cols-4 gap-2" style={{ zoom: 0.38 }}>
        {Array.from({ length: 16 }).map((_, i) => (
          <ShimmerCard key={i} base="rgba(30,18,10,0.55)" sheen="rgba(60,38,20,0.55)" />
        ))}
      </div>
    </>
  );
}

function ClueSectionSkeleton() {
  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <div className="pb-clue-grid grid grid-cols-4 gap-2" style={{ zoom: 0.68, width: "85%" }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <ShimmerCard key={i} base="rgba(160,130,90,0.22)" sheen="rgba(185,155,110,0.32)" />
        ))}
      </div>
    </>
  );
}

// Face-down placeholder for a slot the player hasn't opened yet — mirrors the
// locked-microbe look, with the slot's category so they know what's left to find.
function LockedClue() {
  return (
    <div
      className="flex w-full flex-col items-center justify-center rounded"
      style={{
        aspectRatio: "1429/2000",
        background: "linear-gradient(145deg, #2a1a0a 0%, #1a0e05 60%, #0f0804 100%)",
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.6), inset 0 -1px 2px rgba(255,200,100,0.05)",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#5a3a1a"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-1/3 opacity-60"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </div>
  );
}

// Shows one card per slot the microbe has, in fixed game-slot order. Opened slots
// reveal the card; unopened slots stay face-down so the book reflects exactly what
// this player discovered.
function ClueSection({ slots }: { slots: BookSlot[] }) {
  const sorted = [...slots].sort((a, b) => a.slotIndex - b.slotIndex);

  return (
    <div className="pb-clue-grid grid grid-cols-4 gap-2" style={{ zoom: 0.68, width: "85%" }}>
      {sorted.map((slot) => (
        <div key={slot.slotIndex} className="flex-shrink-0">
          {slot.opened && slot.card ? (
            slot.card.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveImageSrc(slot.card.imageUrl)}
                alt={slot.card.label}
                className="w-full rounded shadow"
                style={{ aspectRatio: "1429 / 2000" }}
                draggable={false}
              />
            ) : (
              <div
                className="flex w-full items-center justify-center rounded bg-[#f5e6c8] p-1 text-[8px] italic text-[#7a5a30] shadow"
                style={{ aspectRatio: "1429/2000" }}
              >
                {slot.card.label}
              </div>
            )
          ) : (
            <LockedClue />
          )}
        </div>
      ))}
    </div>
  );
}


// ─── Stage geometry ───────────────────────────────────────────────────────────

// The book art is 1920x1080. Everything (art, tab hit boxes, page overlays) lives
// on one "stage" whose width always fits the screen and whose height follows the
// art's 16:9 ratio, capped at the viewport height so the screen itself never
// scrolls — only the left and right pages do. On screens wider than 16:9 the art
// stretches horizontally to fill; on taller ones it is centered vertically. The
// percentage-positioned overlays stay locked to the art at every size. Sizes
// inside the stage use `u(n)` = n px at the 1920x1080 design size, scaled by the
// tighter of the stage's width/height so text can't outgrow the pages.
const STAGE_W = 1920;
const u = (n: number) => `calc(${n} * min(100cqw, 100cqh * 16 / 9) / ${STAGE_W})`;

// Tab art in the 1920x1080 image: x 75–208, y 72–616, split into 4 tabs whose
// heights are not equal (152 / 128 / 133 / 131). The hit box is 2x the art's
// width (left edge stays on the art, the extra reaches into the page margin).
const TAB_BOX = {
  left: (75 / 1920) * 100,
  top: (72 / 1080) * 100,
  width: (((208 - 75) * 2) / 1920) * 100,
  height: ((616 - 72) / 1080) * 100,
};
// The active tab pops out, so each page's art has slightly different tab
// boundaries. Heights below are measured per page (each sums to 544).
const TAB_HEIGHTS: Record<GameMode, number[]> = {
  BACTERIA: [152, 128, 133, 131],
  PARASITES: [128, 152, 133, 131],
  FUNGI: [128, 135, 140, 141],
  VIRUS: [128, 135, 130, 151],
};

// ─── Main layout ──────────────────────────────────────────────────────────────

// Shared book shell: viewport-filling stage with the art stretched to it, the
// back button, and the tab hit boxes. Page content goes in as children and is
// positioned as a percentage of the stage.
export function PathogenBookStage({
  gameMode,
  backgroundSrc,
  children,
}: {
  gameMode: GameMode;
  backgroundSrc: string;
  children?: React.ReactNode;
}) {
  return (
    // Root fills the viewport; the stage inside it is the book.
    <div
      className={`${alice.className} pb-page-root relative flex h-dvh w-full overflow-hidden bg-cover bg-center`}
      style={{ backgroundImage: "url('/assets/backgrounds/main_page_background.webp')" }}
    >
      {/* ── Back button — anchored to the viewport, not the stage ── */}
      <Link
        href="/home"
        className="tap-min safe-top safe-left fixed z-30 flex items-center rounded-lg border border-[#d4a96a] bg-[#2a1208]/80 px-4 text-sm font-semibold text-[#f5e6c8] transition-colors hover:bg-[#3d1a0a]"
      >
        ← Back
      </Link>

      {/* ── Stage — fills the viewport; art stretches to it ── */}
      <div
        className="pb-stage relative m-auto w-full shrink-0"
        style={{
          aspectRatio: "16 / 9",
          maxHeight: "100%",
          containerType: "size",
          backgroundImage: `url('${backgroundSrc}')`,
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* ── Category tab strip — transparent hit boxes over the art's tabs ── */}
        <div
          className="pb-tab-nav absolute z-20 flex flex-col"
          style={{
            left: `${TAB_BOX.left}%`,
            top: `${TAB_BOX.top}%`,
            width: `${TAB_BOX.width}%`,
            height: `${TAB_BOX.height}%`,
          }}
        >
          {TABS.map(({ mode, href, label }, i) => (
            <Link
              key={mode}
              href={href}
              title={label}
              aria-label={label}
              aria-current={mode === gameMode ? "page" : undefined}
              className={`min-h-0 rounded transition-all ${
                mode === gameMode ? "" : "hover:bg-white/10"
              }`}
              style={{ flex: `${TAB_HEIGHTS[gameMode][i]} 1 0` }}
            />
          ))}
        </div>

        {/* ── Preload all 4 background images for seamless tab switching ── */}
        <div className="hidden" aria-hidden="true">
          {["bacteria", "fungi", "parasite", "virus"].map((bg) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={bg} src={`/assets/pathogen-book/${bg}.webp`} alt="" />
          ))}
        </div>


        {children}
      </div>
    </div>
  );
}

// Placeholder page for sections whose microbes aren't in the game yet.
export function PathogenBookComingSoon({
  gameMode,
  backgroundSrc,
  title,
}: {
  gameMode: GameMode;
  backgroundSrc: string;
  title: string;
}) {
  return (
    <PathogenBookStage gameMode={gameMode} backgroundSrc={backgroundSrc}>
      <div className="absolute z-10 flex flex-col" style={{ left: "26%", top: "38%", gap: u(4) }}>
        <p className="font-semibold italic text-black" style={{ fontSize: u(54) }}>{title}</p>
        <p className="font-medium text-black" style={{ fontSize: u(36) }}>Coming Soon</p>
        <p className="text-black/70" style={{ fontSize: u(24) }}>This section is under development.</p>
      </div>
    </PathogenBookStage>
  );
}

interface PathogenBookLayoutProps {
  gameMode: GameMode;
  backgroundSrc: string;
}

export function PathogenBookLayout({ gameMode, backgroundSrc }: PathogenBookLayoutProps) {
  const [microbes, setMicrobes] = useState<MicrobeEntry[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [slots, setSlots] = useState<BookSlot[] | null>(null);
  const [cluesLoading, setCluesLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/pathogen-book?gameMode=${gameMode}&withFirstClues=true`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((data: { microbes: MicrobeEntry[]; firstMicrobeId: string | null; firstMicrobeSlots: BookSlot[] | null }) => {
        setMicrobes(data.microbes);
        if (data.firstMicrobeId) {
          setSelectedId(data.firstMicrobeId);
          setSlots(data.firstMicrobeSlots ?? []);
        }
      })
      .catch(() => setMicrobes([]));
  }, [gameMode]);

  function handleSelect(microbeId: string) {
    setSelectedId(microbeId);
    setSlots(null);
    setCluesLoading(true);
    fetch(`/api/pathogen-book/${microbeId}/clues`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch clues");
        return r.json();
      })
      .then((data: { slots: BookSlot[] }) => setSlots(data.slots))
      .catch(() => setSlots([]))
      .finally(() => setCluesLoading(false));
  }

  const selectedMicrobe = microbes?.find((m) => m.id === selectedId) ?? null;

  return (
    <PathogenBookStage gameMode={gameMode} backgroundSrc={backgroundSrc}>
      {/* ── Left page — microbe grid ── */}
      <div
        className="pb-left-page absolute overflow-y-auto"
        style={{ left: "18%", top: "25%", width: "30%", height: "75%" }}
      >
        {microbes === null ? (
          <MicrobeGridSkeleton />
        ) : (
          <div className="pb-microbe-grid grid grid-cols-4 gap-2" style={{ zoom: 0.38 }}>
            {microbes.map((microbe) => (
              <MicrobeCard
                key={microbe.id}
                microbe={microbe}
                selected={microbe.id === selectedId}
                onClick={() => handleSelect(microbe.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Right page — microbe detail ── */}
      <div
        className="pb-right-page absolute flex flex-col"
        style={{ left: "58%", top: "15%", width: "40%", height: "82%" }}
      >
        {!selectedMicrobe ? (
          <div className="flex h-full items-center justify-center">
            <span className="italic text-[#9a7850]" style={{ fontSize: u(18) }}>
              {microbes && microbes.every((m) => !m.unlocked)
                ? "Play the game to discover microbes!"
                : "Select a microbe to view details"}
            </span>
          </div>
        ) : (
          <>
            {/* Fixed header — microbe card + name + rating */}
            <div
              className="pb-detail-header flex items-start shrink-0"
              style={{ gap: u(24), paddingRight: u(72), paddingBottom: u(18) }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveImageSrc(selectedMicrobe.answerImageUrl)}
                alt={selectedMicrobe.name}
                className="pb-detail-thumb shrink-0 object-contain"
                style={{ width: u(312), aspectRatio: "1 / 1" }}
                draggable={false}
              />
              <div className="pb-detail-text flex flex-col" style={{ gap: u(12), paddingTop: u(6) }}>
                <h2
                  className="pb-detail-name font-semibold italic leading-snug text-[#2a1208]"
                  style={{ fontSize: u(36) }}
                >
                  {formatMicrobeName(selectedMicrobe.name)}
                </h2>
                <p
                  className="pb-detail-rating-label uppercase tracking-wider text-[#7a5a30]"
                  style={{ fontSize: u(18) }}
                >
                  Clinical Relevance Rating
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={starSrc(selectedMicrobe.starRating)}
                  alt={`${Math.round(selectedMicrobe.starRating)} stars`}
                  className="pb-detail-stars w-auto self-start object-contain"
                  style={{ height: u(48) }}
                  draggable={false}
                />
              </div>
            </div>

            {/* Scrollable clue section — scrollbar hidden, scrolling still works */}
            <div
              className="overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ msOverflowStyle: "none", paddingRight: u(72) }}
            >
              {cluesLoading ? (
                <ClueSectionSkeleton />
              ) : slots && slots.length > 0 ? (
                <ClueSection slots={slots} />
              ) : slots !== null ? (
                <p className="italic text-[#9a7850]" style={{ fontSize: u(16) }}>
                  No characteristic cards available.
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </PathogenBookStage>
  );
}
