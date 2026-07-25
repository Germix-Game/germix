"use client";

import { useRef, useState, useEffect } from "react";
import type { ClueCard } from "@/types/game";

function resolveImageSrc(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("/")) return url;
  return `/assets/${url}`;
}

interface CardSlotProps {
  index: number;
  revealed: boolean;
  card: ClueCard | null;
  onReveal: (index: number) => void;
  disabled?: boolean;
  revealedCount?: number;
  motionEnabled?: boolean;
}

export function CardSlot({ index, revealed, card, onReveal, disabled, revealedCount = 0, motionEnabled = true }: CardSlotProps) {
  const tiltRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPop, setShowPop] = useState(false);
  const [popLabel, setPopLabel] = useState("-20");

  useEffect(() => {
    if (!revealed) return;
    // First 2 open cards are free; each card beyond the 2nd costs 25 points.
    setPopLabel(revealedCount <= 2 ? "-0" : "-25");
    setShowPop(true);
    const t = setTimeout(() => setShowPop(false), 1100);
    return () => clearTimeout(t);
  }, [revealed]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    const el = tiltRef.current;
    if (!el) return;
    el.classList.remove("card-idle");
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotX = (0.5 - y) * 30;
    const rotY = (x - 0.5) * 30;
    el.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.1,1.1,1.1)`;
    el.style.transition = "transform 60ms linear";
    if (shineRef.current) {
      const angle = Math.atan2(y - 0.5, x - 0.5) * (180 / Math.PI) + 90;
      shineRef.current.style.background = [
        `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,220,0.6) 0%, transparent 52%)`,
        `linear-gradient(${angle}deg, rgba(255,80,80,0.08), rgba(80,255,180,0.08), rgba(80,130,255,0.08))`,
      ].join(", ");
      shineRef.current.style.opacity = "1";
    }
  }

  function handleMouseLeave() {
    const el = tiltRef.current;
    if (!el) return;
    el.style.transition = "transform 500ms cubic-bezier(0.23,1,0.32,1)";
    el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
    if (shineRef.current) shineRef.current.style.opacity = "0";
    leaveTimer.current = setTimeout(() => {
      if (tiltRef.current) {
        tiltRef.current.style.transform = "";
        tiltRef.current.style.transition = "";
        if (tiltRef.current.dataset.revealed !== "true" && motionEnabled) {
          tiltRef.current.classList.add("card-idle");
        }
      }
      leaveTimer.current = null;
    }, 500);
  }

  return (
    <div
      ref={tiltRef}
      className={`card-tilt h-[28vh]${!revealed && !disabled && motionEnabled ? " card-idle" : ""}`}
      data-revealed={revealed ? "true" : "false"}
      style={{
        aspectRatio: "1429 / 2000",
        "--card-idle-delay": `${index * 0.35}s`,
      } as React.CSSProperties}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={shineRef} className="card-shine" aria-hidden />
      {showPop && <span className="point-pop" aria-hidden>{popLabel}</span>}
      <div className="card-wrapper w-full h-full">
      <div className={`card-inner${revealed ? " flipped" : ""}`}>

        {/*
         * IMAGE SLOT A — Card back (face-down state)
         * What: The design shown on the back of every hidden card before the player flips it.
         * Source: /public/assets/ui/Backcard.png (served at /assets/ui/Backcard.png)
         * Applied as a Tailwind arbitrary-value background utility (bg-cover, bg-center).
         * The hover:brightness-125 stays — gives visual feedback when the card is hoverable.
         * To swap: drop a new file at the same path. No code change needed.
         */}
        {/* <button
          className="card-face w-full h-full rounded-3xl bg-[url('/assets/ui/Backcard.png')] bg-cover bg-center shadow-lg hover:brightness-125 focus-visible:ring-2 focus-visible:ring-[#d4a96a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#5c2a0e] disabled:cursor-default disabled:hover:brightness-100 transition-[filter]"
          onClick={() => onReveal(index)}
          disabled={revealed || disabled}
          aria-label={`Reveal clue card ${index + 1}`}
          tabIndex={revealed ? -1 : 0}
        /> */}
        <button
          className="card-face w-full h-full rounded-3xl overflow-hidden bg-[url('/assets/ui/Backcard.png')] bg-cover bg-center shadow-lg hover:brightness-125 focus-visible:ring-2 focus-visible:ring-[#d4a96a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#5c2a0e] disabled:cursor-default disabled:hover:brightness-100 transition-[filter]"
          onClick={() => onReveal(index)}
          disabled={revealed || disabled}
          aria-label={`Reveal clue card ${index + 1}`}
          tabIndex={revealed ? -1 : 0}
        />

        {/* Revealed front face */}
        <div
          className="card-face card-face-front w-full h-full rounded-3xl shadow-lg bg-[#f5e6c8] relative flex flex-col items-center justify-center gap-1.5 p-2"
          aria-hidden={!revealed}
        >
          {revealed && !card && (
            <div className="flex flex-col items-center gap-2 w-3/4">
              <div className="h-1.5 w-full rounded-full bg-[#d4a96a]/50 animate-pulse" />
              <div className="h-1.5 w-4/5 rounded-full bg-[#d4a96a]/40 animate-pulse" style={{ animationDelay: "0.15s" }} />
              <div className="h-1.5 w-3/5 rounded-full bg-[#d4a96a]/30 animate-pulse" style={{ animationDelay: "0.3s" }} />
            </div>
          )}
          {card && (
            <>
              {/* Text fallback shown while/if image is absent */}
              <span className="text-[0.55rem] uppercase tracking-wider text-[#9a7850] text-center leading-tight">
                {card.category.replace(/_/g, " ")}
              </span>
              <span className="text-[0.7rem] text-[#3a2010] text-center italic leading-snug line-clamp-4">
                {card.label}
              </span>

              {/*
               * IMAGE SLOT B — Clue card front (revealed state)
               * File: src/components/game/CardSlot.tsx
               * What: The hand-drawn cartoon PNG that fills the card after the player flips it.
               *       One unique PNG per clue card (600 total).
               * Source: card.imageUrl — Supabase Storage CDN URL populated by the seed script.
               *         Naming convention: {microbe-name}-{category}-{index}.png
               *         e.g. "staphylococcus-aureus-gram-stain-01.png"
               * Replace: No code change needed — just upload PNGs to Supabase Storage and run
               *          the seed script to populate ClueCard.imageUrl in the database.
               *          The <img> below will automatically show them once the URL is set.
               */}
              {card.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveImageSrc(card.imageUrl)}
                  alt={card.label}
                  className="absolute inset-0 w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
            </>
          )}
        </div>

      </div>
      </div>
    </div>
  );
}
