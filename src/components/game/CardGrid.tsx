"use client";

import type { RefObject } from "react";
import type { CardSlotState } from "@/types/game";
import { CardSlot } from "./CardSlot";

interface CardGridProps {
  slots: CardSlotState[];
  onReveal: (index: number) => void;
  locked?: boolean;
  canAnswer: boolean;
  isSubmitting?: boolean;
  onAnswer: () => void;
  dropTargetRef: RefObject<HTMLDivElement | null>;
  isDraggingOver: boolean;
  pendingMicrobeName: string | null;
  onConfirm: () => void;
  onCancelPending: () => void;
}

export function CardGrid({
  slots,
  onReveal,
  locked,
  canAnswer,
  isSubmitting,
  onAnswer,
  dropTargetRef,
  isDraggingOver,
  pendingMicrobeName,
  onConfirm,
  onCancelPending,
}: CardGridProps) {
  const revealedCount = slots.filter((s) => s.revealed).length;

  return (
    <div className="grid grid-cols-6 gap-3 w-full">
      {slots.map((slot) => (
        <CardSlot
          key={slot.index}
          index={slot.index}
          revealed={slot.revealed}
          card={slot.card}
          onReveal={onReveal}
          disabled={locked}
          revealedCount={revealedCount}
        />
      ))}

      {/* Answer drop zone — same size as a card slot (6th column) */}
      <div ref={dropTargetRef} style={{ aspectRatio: "1429 / 2000" }}>
        {pendingMicrobeName ? (
          /* Confirmation state — shown after a microbe is dropped */
          <div
            className={`w-full h-full flex flex-col rounded-xl overflow-hidden border-2 transition-all ${
              isDraggingOver
                ? "border-[#d4a96a] scale-105"
                : "border-[#d4a96a]"
            }`}
          >
            <div className="flex-1 flex items-center justify-center bg-[#f5e6c8] px-2 py-1">
              <span className="text-[0.65rem] italic text-[#3a2010] text-center leading-tight line-clamp-4">
                {pendingMicrobeName}
              </span>
            </div>
            <div className="flex flex-shrink-0">
              <button
                onClick={onCancelPending}
                className="flex-1 py-2 bg-[#4a3020] text-[#d4a96a] hover:bg-[#5a4030] font-bold text-sm transition-colors"
                aria-label="Cancel"
              >
                ✕
              </button>
              <button
                onClick={onConfirm}
                disabled={isSubmitting}
                className="flex-1 py-2 bg-[#4a7c3f] text-white hover:bg-[#5a8c4f] font-bold text-sm transition-colors disabled:opacity-50"
                aria-label="Confirm answer"
              >
                {isSubmitting ? "…" : "✓"}
              </button>
            </div>
          </div>
        ) : (
          /* Normal drop / answer button */
          <button
            onClick={onAnswer}
            disabled={!canAnswer || isSubmitting}
            title={!canAnswer ? "Drag a microbe here to answer" : undefined}
            aria-label="Submit answer"
            className={`w-full h-full rounded-xl font-semibold text-sm shadow-md transition-all focus-visible:ring-2 focus-visible:ring-[#d4a96a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#5c2a0e] ${
              isDraggingOver
                ? "bg-[#e0b87a] scale-105 ring-2 ring-[#d4a96a] ring-offset-2 ring-offset-[#5c2a0e] shadow-lg text-[#2a1208]"
                : "bg-[#d4a96a] text-[#2a1208] hover:bg-[#e0b87a] disabled:bg-[#4a3020] disabled:text-[#6a5040] disabled:cursor-not-allowed disabled:shadow-none"
            }`}
          >
            {isSubmitting ? "…" : isDraggingOver ? "Drop!" : "Answer"}
          </button>
        )}
      </div>
    </div>
  );
}
