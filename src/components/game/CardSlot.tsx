"use client";

import type { ClueCard } from "@/types/game";

interface CardSlotProps {
  index: number;
  revealed: boolean;
  card: ClueCard | null;
  onReveal: (index: number) => void;
  disabled?: boolean;
}

export function CardSlot({ index, revealed, card, onReveal, disabled }: CardSlotProps) {
  return (
    <div className="card-wrapper w-full" style={{ aspectRatio: "3/4" }}>
      <div className={`card-inner${revealed ? " flipped" : ""}`}>

        {/*
         * IMAGE SLOT A — Card back (face-down state)
         * What: The design shown on the back of every hidden card before the player flips it.
         * Source: /public/asset/ui/Backcard.png (served at /asset/ui/Backcard.png)
         * Applied as a Tailwind arbitrary-value background utility (bg-cover, bg-center).
         * The hover:brightness-125 stays — gives visual feedback when the card is hoverable.
         * To swap: drop a new file at the same path. No code change needed.
         */}
        <button
          className="card-face w-full h-full rounded-xl bg-[url('/asset/ui/Backcard.png')] bg-cover bg-center shadow-lg hover:brightness-125 focus-visible:ring-2 focus-visible:ring-[#d4a96a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#5c2a0e] disabled:cursor-default disabled:hover:brightness-100 transition-[filter]"
          onClick={() => onReveal(index)}
          disabled={revealed || disabled}
          aria-label={`Reveal clue card ${index + 1}`}
          tabIndex={revealed ? -1 : 0}
        />

        {/* Revealed front face */}
        <div
          className="card-face card-face-front w-full h-full rounded-xl overflow-hidden shadow-lg bg-[#f5e6c8] relative flex flex-col items-center justify-center gap-1.5 p-2"
          aria-hidden={!revealed}
        >
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
                  src={card.imageUrl}
                  alt={card.label}
                  className="absolute inset-0 w-full h-full object-cover rounded-xl"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
