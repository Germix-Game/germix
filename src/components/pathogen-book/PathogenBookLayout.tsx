"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alice } from "next/font/google";

const alice = Alice({ weight: "400", subsets: ["latin"] });

// ─── Types ────────────────────────────────────────────────────────────────────

type GramType = "POSITIVE" | "NEGATIVE" | "ACID_FAST" | "OTHER";

type MicrobeEntry = {
  id: string;
  name: string;
  shortName: string;
  answerImageUrl: string;
  gramType: GramType;
  starRating: number;
  unlocked: boolean;
};

type ClueCardEntry = {
  id: string;
  category: string;
  label: string;
  imageUrl: string;
  sortOrder: number;
};

type GameMode = "BACTERIA" | "FUNGI" | "PARASITE" | "VIRUS";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// DB stores paths without the /assets/ prefix (e.g. "cards/answers/bacteria/foo.png").
// Supabase Storage CDN URLs start with "https://". Both cases are handled here.
function resolveImageSrc(url: string): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("/")) return url;
  return `/assets/${url}`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: { mode: GameMode; href: string; label: string }[] = [
  { mode: "BACTERIA", href: "/pathogen-book/bacteria", label: "Bacteria" },
  { mode: "PARASITE", href: "/pathogen-book/parasite", label: "Parasite" },
  { mode: "FUNGI",    href: "/pathogen-book/fungi",    label: "Fungi"    },
  { mode: "VIRUS",    href: "/pathogen-book/virus",    label: "Virus"    },
];

const CATEGORY_ORDER = [
  "GRAM_STAIN",
  "CLINICAL_MANIFESTATION",
  "LAB_CHARACTERISTIC",
  "VIRULENCE_FACTOR",
  "SPECIAL_TRAIT",
];

const CATEGORY_LABEL: Record<string, string> = {
  GRAM_STAIN: "Gram Stain",
  CLINICAL_MANIFESTATION: "Clinical Manifestation",
  LAB_CHARACTERISTIC: "Lab Characteristic",
  VIRULENCE_FACTOR: "Virulence Factor",
  SPECIAL_TRAIT: "Special Trait",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function starSrc(rating: number): string {
  const n = Math.min(5, Math.max(1, Math.round(rating)));
  return `/assets/pathogen-book/star-${n}.png`;
}

function GramBadge({ gramType }: { gramType: GramType }) {
  if (gramType === "POSITIVE")
    return (
      <span className="absolute top-1 left-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white shadow">
        +
      </span>
    );
  if (gramType === "NEGATIVE")
    return (
      <span className="absolute top-1 left-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">
        −
      </span>
    );
  if (gramType === "ACID_FAST")
    return (
      <span className="absolute top-1 left-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white shadow">
        AF
      </span>
    );
  return null;
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
      className={`relative flex flex-col items-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a96a] ${
        selected ? "scale-105 ring-2 ring-[#c8873a]" : ""
      } ${!microbe.unlocked ? "cursor-default" : "cursor-pointer"}`}
    >
      {microbe.unlocked ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveImageSrc(microbe.answerImageUrl)}
            alt={microbe.name}
            className="w-full object-contain"
            draggable={false}
          />
        </>
      ) : (
        <div
          className="flex w-full flex-col items-center justify-center rounded-sm"
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

function ClueSection({ cards }: { cards: ClueCardEntry[] }) {
  const grouped: Record<string, ClueCardEntry[]> = {};
  for (const cat of CATEGORY_ORDER) grouped[cat] = [];
  for (const card of cards) {
    if (!grouped[card.category]) grouped[card.category] = [];
    grouped[card.category].push(card);
  }

  return (
    <div className="flex flex-col gap-2">
      {CATEGORY_ORDER.map((cat) => {
        const items = grouped[cat];
        if (!items || items.length === 0) return null;
        return (
          <div key={cat}>
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-[#7a5a30]">
              {CATEGORY_LABEL[cat]}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((card) => (
                <div key={card.id} className="w-16 flex-shrink-0">
                  {card.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveImageSrc(card.imageUrl)}
                      alt={card.label}
                      className="w-full rounded shadow"
                      draggable={false}
                    />
                  ) : (
                    <div className="flex w-full items-center justify-center rounded bg-[#f5e6c8] p-1 text-[8px] italic text-[#7a5a30] shadow" style={{ aspectRatio: "1429/2000" }}>
                      {card.label}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main layout ──────────────────────────────────────────────────────────────

interface PathogenBookLayoutProps {
  gameMode: GameMode;
  backgroundSrc: string;
}

export function PathogenBookLayout({ gameMode, backgroundSrc }: PathogenBookLayoutProps) {
  const [microbes, setMicrobes] = useState<MicrobeEntry[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/pathogen-book?gameMode=${gameMode}`)
      .then((r) => r.json())
      .then((data: MicrobeEntry[]) => {
        setMicrobes(data);
        const first = data.find((m) => m.unlocked);
        if (first) setSelectedId(first.id);
      });
  }, [gameMode]);

  function handleSelect(microbeId: string) {
    setSelectedId(microbeId);
  }

  const selectedMicrobe = microbes?.find((m) => m.id === selectedId) ?? null;

  return (
    <div
      className={`${alice.className} relative h-screen w-screen overflow-hidden bg-cover bg-center`}
      style={{
        backgroundImage: `url('${backgroundSrc}'), url('/assets/backgrounds/main_page_background.png')`,
        backgroundSize: "auto 100%, cover",
        backgroundRepeat: "no-repeat, no-repeat",
        backgroundPosition: "center, center",
      }}
    >
      {/* ── Back button ── */}
      <Link
        href="/home"
        className="absolute left-4 top-4 z-30 flex items-center gap-1.5 rounded-full bg-[#3a1f08]/70 px-3 py-1.5 text-xs font-semibold text-[#f5e6c8] shadow backdrop-blur-sm transition-all hover:bg-[#3a1f08]/90"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Back
      </Link>

      {/* ── Category tab strip — transparent overlays aligned to the book's visual sidebar ── */}
      <div
        className="absolute z-20 flex flex-col"
        style={{ left: "13%", top: "8%", width: "5.5vw", height: "49vh" }}
      >
        {TABS.map(({ mode, href, label }) => (
          <Link
            key={mode}
            href={href}
            title={label}
            className={`flex-1 rounded transition-all ${
              mode === gameMode ? "" : "hover:bg-white/10"
            }`}
          />
        ))}
      </div>

      {/* ── Preload all 4 background images for seamless tab switching ── */}
      <div className="hidden" aria-hidden="true">
        {["bacteria", "fungi", "parasite", "virus"].map((bg) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={bg} src={`/assets/pathogen-book/${bg}.png`} alt="" />
        ))}
      </div>

      {/* ── Left page — microbe grid ── */}
      <div
        className="absolute overflow-y-auto"
        style={{ left: "22%", top: "25%", width: "30%", height: "75%" }}
      >
        {microbes === null ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-3 w-3 rounded-full bg-[#c8873a]"
                    style={{ animation: `pbBounce 1s ease-in-out ${i * 0.2}s infinite` }}
                  />
                ))}
              </div>
              <style>{`
                @keyframes pbBounce {
                  0%, 100% { transform: translateY(0); opacity: 0.4; }
                  50% { transform: translateY(-8px); opacity: 1; }
                }
              `}</style>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2" style={{ zoom: 0.38 }}>
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
        className="absolute overflow-y-auto"
        style={{ left: "55%", top: "15%", width: "40%", height: "82%" }}
      >
        {!selectedMicrobe ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-xs italic text-[#9a7850]">Select a microbe to view details</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Detail card + text header */}
            <div className="flex items-start gap-4">
              {/* Card — intentionally larger than grid cards (no zoom) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveImageSrc(selectedMicrobe.answerImageUrl)}
                alt={selectedMicrobe.name}
                className="w-52 shrink-0 object-contain"
                style={{ aspectRatio: "1 / 1" }}
                draggable={false}
              />

              {/* Name + rating */}
              <div className="flex flex-col gap-2 pt-1">
                <h2 className="text-2xl font-semibold italic leading-snug text-[#2a1208]">
                  {selectedMicrobe.name}
                </h2>
                <p className="text-[12px] uppercase tracking-wider text-[#7a5a30]">
                  Clinical Relevance Rating
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={starSrc(selectedMicrobe.starRating)}
                  alt={`${Math.round(selectedMicrobe.starRating)} stars`}
                  className="h-8 w-auto self-start object-contain"
                  draggable={false}
                />
              </div>
            </div>

            {/* TODO: Characteristic cards — not yet implemented. See §9.3 in docs. */}
          </div>
        )}
      </div>
    </div>
  );
}
