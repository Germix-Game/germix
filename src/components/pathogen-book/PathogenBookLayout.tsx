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
  { mode: "PARASITES", href: "/pathogen-book/parasite", label: "Parasite" },
  { mode: "FUNGI",    href: "/pathogen-book/fungi",    label: "Fungi"    },
  { mode: "VIRUS",    href: "/pathogen-book/virus",    label: "Virus"    },
];

const CATEGORY_LABEL: Record<string, string> = {
  GRAM_STAIN: "Gram Stain",
  CLINICAL_MANIFESTATION: "Clinical Manifestation",
  LAB_CHARACTERISTIC: "Lab Characteristic",
  VIRULENCE_FACTOR: "Virulence Factor",
  SPECIAL_TRAIT: "Special Trait",
  TRANSMISSION: "Transmission",
  MORPHOLOGY: "Morphology",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function starSrc(rating: number): string {
  const n = Math.min(5, Math.max(1, Math.round(rating * 2) / 2));
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
      <div className="grid grid-cols-4 gap-2" style={{ zoom: 0.38 }}>
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
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <ShimmerCard key={i} base="rgba(160,130,90,0.22)" sheen="rgba(185,155,110,0.32)" />
        ))}
      </div>
    </>
  );
}

// Face-down placeholder for a slot the player hasn't opened yet — mirrors the
// locked-microbe look, with the slot's category so they know what's left to find.
function LockedClue({ category }: { category: string }) {
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
      <span className="mt-1 px-1 text-center text-[7px] uppercase leading-tight tracking-wide text-[#7a5a30]">
        {CATEGORY_LABEL[category] ?? ""}
      </span>
    </div>
  );
}

// Shows one card per slot the microbe has, in fixed game-slot order. Opened slots
// reveal the card; unopened slots stay face-down so the book reflects exactly what
// this player discovered.
function ClueSection({ slots }: { slots: BookSlot[] }) {
  const sorted = [...slots].sort((a, b) => a.slotIndex - b.slotIndex);

  return (
    <div className="grid grid-cols-4 gap-2">
      {sorted.map((slot) => (
        <div key={slot.slotIndex} className="flex-shrink-0">
          {slot.opened && slot.card ? (
            slot.card.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveImageSrc(slot.card.imageUrl)}
                alt={slot.card.label}
                className="w-full rounded shadow"
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
            <LockedClue category={slot.category} />
          )}
        </div>
      ))}
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
        className="absolute left-4 top-4 z-30 flex h-9 items-center rounded-lg border border-[#d4a96a] bg-[#2a1208]/80 px-4 text-sm font-semibold text-[#f5e6c8] transition-colors hover:bg-[#3d1a0a]"
      >
        ← Back
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
          <MicrobeGridSkeleton />
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
        className="absolute flex flex-col"
        style={{ left: "55%", top: "15%", width: "40%", height: "82%" }}
      >
        {!selectedMicrobe ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-xs italic text-[#9a7850]">
              {microbes && microbes.every((m) => !m.unlocked)
                ? "Play the game to discover microbes!"
                : "Select a microbe to view details"}
            </span>
          </div>
        ) : (
          <>
            {/* Fixed header — microbe card + name + rating */}
            <div className="flex items-start gap-4 pr-12 pb-3 shrink-0">
              <img
                src={resolveImageSrc(selectedMicrobe.answerImageUrl)}
                alt={selectedMicrobe.name}
                className="w-52 shrink-0 object-contain"
                style={{ aspectRatio: "1 / 1" }}
                draggable={false}
              />
              <div className="flex flex-col gap-2 pt-1">
                <h2 className="text-2xl font-semibold italic leading-snug text-[#2a1208]">
                  {selectedMicrobe.name}
                </h2>
                <p className="text-[12px] uppercase tracking-wider text-[#7a5a30]">
                  Clinical Relevance Rating
                </p>
                <img
                  src={starSrc(selectedMicrobe.starRating)}
                  alt={`${Math.round(selectedMicrobe.starRating)} stars`}
                  className="h-8 w-auto self-start object-contain"
                  draggable={false}
                />
              </div>
            </div>

            {/* Scrollable clue section */}
            <div className="overflow-y-auto pr-12">
              {cluesLoading ? (
                <ClueSectionSkeleton />
              ) : slots && slots.length > 0 ? (
                <ClueSection slots={slots} />
              ) : slots !== null ? (
                <p className="text-[11px] italic text-[#9a7850]">No characteristic cards available.</p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
