"use client";

import { useState, useEffect, useRef } from "react";

const MAX_HEARTS = 3;
const FLASH_MS = 800;

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
  // displayHearts stays at the old value while the flash animation plays,
  // then snaps to the real heartsLeft after FLASH_MS so the dead image appears.
  const [displayHearts, setDisplayHearts] = useState(heartsLeft);
  const [flashSet, setFlashSet] = useState<ReadonlySet<number>>(new Set());
  const prevRef = useRef(heartsLeft);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = heartsLeft;

    if (heartsLeft < prev) {
      const losing = new Set<number>();
      for (let i = heartsLeft; i < prev; i++) losing.add(i);
      setFlashSet(losing);

      const t = setTimeout(() => {
        setDisplayHearts(heartsLeft);
        setFlashSet(new Set());
      }, FLASH_MS);

      return () => clearTimeout(t);
    } else {
      setDisplayHearts(heartsLeft);
    }
  }, [heartsLeft]);

  return (
    <div
      className={vertical ? "flex flex-col items-center gap-2" : "flex items-center gap-2"}
      role="img"
      aria-label={`${heartsLeft} of ${MAX_HEARTS} lives remaining`}
    >
      {Array.from({ length: MAX_HEARTS }, (_, i) => (
        <PixelHeart key={i} filled={i < displayHearts} flashing={flashSet.has(i)} />
      ))}
    </div>
  );
}

function PixelHeart({ filled, flashing }: { filled: boolean; flashing: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={filled ? "/assets/ui/heart-alive.png" : "/assets/ui/heart-dead.png"}
      alt=""
      width={56}
      height={48}
      style={{ imageRendering: "pixelated" }}
      className={flashing ? "heart-flash" : undefined}
      aria-hidden="true"
    />
  );
}
