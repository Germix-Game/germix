import { forwardRef } from "react";

interface ScoreBarProps {
  score: number;
  flashKey?: number;
}

export const ScoreBar = forwardRef<HTMLDivElement, ScoreBarProps>(
  function ScoreBar({ score, flashKey = 0 }, ref) {
    return (
      <div ref={ref} className="bg-[#3d1a0a] border border-[#6b3520] rounded-lg px-3 py-1">
        <span
          key={flashKey}
          className={`font-mono font-bold tabular-nums text-base${flashKey > 0 ? " score-bar-pulse text-[#f5e6c8]" : " text-[#d4a96a]"}`}
          aria-label={`Score: ${score}`}
        >
          {String(score).padStart(4, "0")}
        </span>
      </div>
    );
  }
);
