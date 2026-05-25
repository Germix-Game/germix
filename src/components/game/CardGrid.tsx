"use client";

import type { CardSlotState } from "@/types/game";
import { CardSlot } from "./CardSlot";

interface CardGridProps {
  slots: CardSlotState[];
  onReveal: (index: number) => void;
  locked?: boolean;
  canAnswer: boolean;
  isSubmitting?: boolean;
  onAnswer: () => void;
}

export function CardGrid({
  slots,
  onReveal,
  locked,
  canAnswer,
  isSubmitting,
  onAnswer,
}: CardGridProps) {
  return (
    <div className="flex items-stretch gap-4 w-full">
      <div className="grid grid-cols-5 gap-3 flex-1 place-items-center">
        {slots.map((slot) => (
          <CardSlot
            key={slot.index}
            index={slot.index}
            revealed={slot.revealed}
            card={slot.card}
            onReveal={onReveal}
            disabled={locked}
          />
        ))}
      </div>

      {/* Answer button — right of cards, vertically centred */}
      <div className="flex items-center flex-shrink-0">
        <button
          onClick={onAnswer}
          disabled={!canAnswer || isSubmitting}
          title={!canAnswer ? "Reveal at least 1 clue card to answer" : undefined}
          aria-label="Submit answer"
          className="px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-colors focus-visible:ring-2 focus-visible:ring-[#d4a96a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#5c2a0e] bg-[#d4a96a] text-[#2a1208] hover:bg-[#e0b87a] disabled:bg-[#4a3020] disabled:text-[#6a5040] disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isSubmitting ? "…" : "Answer"}
        </button>
      </div>
    </div>
  );
}
