import { forwardRef } from "react";

interface ScoreBarProps {
  score: number;
  flashKey?: number;
}

export const ScoreBar = forwardRef<HTMLDivElement, ScoreBarProps>(
  function ScoreBar({ score, flashKey = 0 }, ref) {
    return (
      <div ref={ref} className="flex items-center gap-2 rounded-lg bg-black/40 px-3 py-1.5 backdrop-blur-sm">
        <span className="text-[0.6rem] font-semibold uppercase tracking-widest text-[#c4a870] select-none">
          Score
        </span>
        <span
          key={flashKey}
          className={`font-mono font-bold tabular-nums text-2xl${flashKey > 0 ? " score-bar-pulse text-[#f5e6c8]" : " text-[#d4a96a]"}`}
          aria-label={`Score: ${score}`}
        >
          {String(score).padStart(4, "0")}
        </span>
      </div>
    );
  }
);
