import type { ReactNode } from "react";

/**
 * Parchment panel on the home menu, and the positioning context for whatever
 * sits on it.
 *
 * The panel declares `@container`, so anything inside can be sized in `cqw`
 * units — 1cqw = 1% of THIS panel's width, not the viewport. That's what makes
 * the menu buttons relative to the paper: resize or move the paper and the
 * buttons follow, at the same proportions, with nothing else to update.
 *
 * Everything tunable is in the block below.
 */

// ─── Tuning ───────────────────────────────────────────────────────────────────

/** Paper size + position, as percentages of the viewport. */
const PAPER_WIDTH = "44%";
const PAPER_LEFT = "50%";
const PAPER_BOTTOM = "-60px";
const PAPER_OPACITY = 1;
const PAPER_TOP_FALLBACK = "calc(27vh + 6.45vw + 8px)";

/**
 * Where the content sits on the paper, as a percentage of the PAPER's height.
 * Because it's relative to the paper rather than the screen, this stays put
 * when the paper is resized or the window aspect changes.
 */
const CONTENT_TOP = "45%";

// ──────────────────────────────────────────────────────────────────────────────

export function ParchmentPanel({
  loaded,
  top,
  children,
}: {
  loaded: boolean;
  top?: string | number;
  children?: ReactNode;
}) {
  return (
    <div
      className="@container absolute z-10"
      style={{
        top: top ?? PAPER_TOP_FALLBACK,
        bottom: PAPER_BOTTOM,
        left: PAPER_LEFT,
        width: PAPER_WIDTH,
        transform: "translateX(-50%)",
        animation: loaded ? "menu-fade-in 650ms ease-out 200ms both" : "none",
      }}
    >
      {/* Opacity and pointer-events live on the IMAGE, not the wrapper.
          On the wrapper they would be inherited by the buttons — making them
          translucent and unclickable. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/ui/main-page-element-bg.webp"
        alt=""
        aria-hidden="true"
        className="pointer-events-none h-full w-full object-fill select-none"
        style={{ opacity: PAPER_OPACITY }}
        draggable={false}
      />

      {children && (
        <div
          className="absolute left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
          style={{ top: CONTENT_TOP, gap: "min(2cqw, 12px)" }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
