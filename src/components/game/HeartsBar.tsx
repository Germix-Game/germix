const MAX_HEARTS = 3;

interface HeartsBarProps {
  heartsLeft: number;
  vertical?: boolean;
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
export function HeartsBar({ heartsLeft, vertical }: HeartsBarProps) {
  return (
    <div
      className={vertical ? "flex flex-col items-center gap-2" : "flex items-center gap-2"}
      role="img"
      aria-label={`${heartsLeft} of ${MAX_HEARTS} lives remaining`}
    >
      {Array.from({ length: MAX_HEARTS }, (_, i) => (
        <PixelHeart key={i} filled={i < heartsLeft} />
      ))}
    </div>
  );
}

function PixelHeart({ filled }: { filled: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={filled ? "/asset/ui/heart-alive.png" : "/asset/ui/heart-dead.png"}
      alt=""
      width={56}
      height={48}
      style={{ imageRendering: "pixelated" }}
      aria-hidden="true"
    />
  );
}
