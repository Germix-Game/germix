const MAX_HEARTS = 3;

interface HeartsBarProps {
  heartsLeft: number;
}

/*
 * IMAGE SLOT E — Pixel heart icons (health / lives display)
 * File: src/components/game/HeartsBar.tsx
 *
 * What: 3 hearts shown side-by-side. Red = life remaining, dark = life lost.
 * Design ref: Germix graphic game(2).png  (left column = red alive hearts,
 *              right column = black lost hearts)
 *
 * Current implementation: SVG pixel-art hearts drawn in code (placeholder).
 *
 * To replace with real PNG sprites:
 *   1. Export two PNGs from the design file:
 *        public/assets/ui/heart-alive.png   ← red pixel heart
 *        public/assets/ui/heart-dead.png    ← black pixel heart
 *   2. Replace the <PixelHeart> SVG below with:
 *
 *        import Image from "next/image"
 *        function PixelHeart({ filled }: { filled: boolean }) {
 *          return (
 *            <Image
 *              src={filled ? "/assets/ui/heart-alive.png" : "/assets/ui/heart-dead.png"}
 *              alt=""
 *              width={28}
 *              height={24}
 *              style={{ imageRendering: "pixelated" }}
 *            />
 *          )
 *        }
 *
 *   The HeartsBar component itself (the parent) does not need to change.
 */
export function HeartsBar({ heartsLeft }: HeartsBarProps) {
  return (
    <div
      className="flex items-center gap-2"
      role="img"
      aria-label={`${heartsLeft} of ${MAX_HEARTS} lives remaining`}
    >
      {Array.from({ length: MAX_HEARTS }, (_, i) => (
        <PixelHeart key={i} filled={i < heartsLeft} />
      ))}
    </div>
  );
}

/* Placeholder SVG heart — replace with PNG sprites (see IMAGE SLOT E above) */
function PixelHeart({ filled }: { filled: boolean }) {
  // 7×6 pixel grid:
  //   . X X . X X .
  //   X X X X X X X
  //   X X X X X X X
  //   . X X X X X .
  //   . . X X X . .
  //   . . . X . . .
  const fill = filled ? "#8b3333" : "#2a1515";
  const highlight = "#c45555";

  return (
    <svg
      width="28"
      height="24"
      viewBox="0 0 7 6"
      style={{ imageRendering: "pixelated" }}
      aria-hidden="true"
    >
      <rect x="1" y="0" width="2" height="1" fill={fill} />
      <rect x="4" y="0" width="2" height="1" fill={fill} />
      <rect x="0" y="1" width="7" height="2" fill={fill} />
      <rect x="1" y="3" width="5" height="1" fill={fill} />
      <rect x="2" y="4" width="3" height="1" fill={fill} />
      <rect x="3" y="5" width="1" height="1" fill={fill} />
      {filled && <rect x="1" y="1" width="1" height="1" fill={highlight} />}
    </svg>
  );
}
