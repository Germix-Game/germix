// Props interface — defines what data this component receives from its parent.
// Note: previously had a `round` prop, but the round counter has moved out of this
// component into a centered image above the card grid (see /asset/ui/round-${n}.png in play/page.tsx).
interface ScoreBarProps {
  score: number;
}

/*
 * IMAGE SLOT G — Score badge
 * File: src/components/game/ScoreBar.tsx
 * What: The "SCORE" pill/badge that displays the current score number.
 * Design ref: Germix graphic game(2).png — tan rounded-rectangle badge
 *             with the word "SCORE" and the number inside.
 * Current implementation: plain styled <div> (placeholder).
 * To replace: export the badge background as a PNG and use it as a
 *   background-image, keeping the score number as an overlay <span>.
 *   Asset: public/assets/ui/score-badge.png
 */
export function ScoreBar({ score }: ScoreBarProps) {
  return (
    // Score badge container — dark brown box with a contrasting tan border
    <div className="bg-[#3d1a0a] border border-[#6b3520] rounded-lg px-3 py-1">
      <span
        // font-mono → fixed-width digits so numbers don't shift width as score rises
        // tabular-nums → CSS feature that locks digit widths even in proportional fonts
        // aria-label → screen-reader text (the visible "0000" is decorative)
        className="font-mono text-[#d4a96a] font-bold tabular-nums text-base"
        aria-label={`Score: ${score}`}
      >
        {/* padStart(4, "0") → pad with leading zeros so single-digit scores show as "0001" instead of "1" */}
        {String(score).padStart(4, "0")}
      </span>
    </div>
  );
}
