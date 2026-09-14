import Link from "next/link";

const NAV_LINKS = [
  { label: "HOW TO PLAY",          href: "/how-to-play"  },
  { label: "LEADERBOARD",          href: "/leaderboard"  },
  { label: "PATHOGEN BOOK",        href: "/pathogen-book"},
  { label: "CREDITS & REFERENCES", href: "/credits"      },
] as const;

/**
 * Main menu buttons.
 *
 * SIZING: `min(<n>cqw, <original>px)`
 *
 * 1cqw = 1% of the nearest `@container` ancestor's width — that's
 * ParchmentPanel, i.e. the paper behind these buttons. So the buttons are
 * relative to the paper.
 *
 * The `min()` caps every value at its ORIGINAL pixel size, so at the reference
 * width (563px paper = 44% of a 1280px viewport) and anything wider, these
 * render exactly as they did before this was made paper-relative. Below that
 * they shrink with the paper instead of overflowing it.
 *
 * Without the cap they grow without limit — on a 1920px viewport the paper is
 * 845px, and 42.6cqw would be a 360px-wide button instead of 240px.
 *
 * Original px values are kept inline below so the mapping stays obvious.
 */

const SIZE = {
  width:      "min(42.6cqw, 240px)",  // was w-[240px]
  gap:        "min(1.8cqw, 10px)",    // was gap-2.5
  playHeight: "min(11cqw, 62px)",     // was h-[62px]
  playFont:   "min(4.6cqw, 26px)",    // was text-[26px]
  playRadius: "min(3.2cqw, 18px)",    // was rounded-[18px]
  navHeight:  "min(7.8cqw, 44px)",    // was h-11
  navFont:    "min(2.5cqw, 14px)",    // was text-sm
  navRadius:  "min(2.1cqw, 12px)",    // was rounded-xl
} as const;

export function MenuButtons({
  posttestRequired = false,
  onPlayClick,
}: {
  posttestRequired?: boolean;
  onPlayClick?: () => void;
}) {
  const playClasses =
    "menu-btn menu-btn-play flex w-full items-center justify-center border-2 border-[#265215] bg-[#3a7d20] text-white shadow-[3px_4px_8px_rgba(0,0,0,0.4)] hover:border-[#80d040] hover:bg-[#4da030] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80d040] cursor-pointer";

  const playStyle = {
    height: SIZE.playHeight,
    fontSize: SIZE.playFont,
    borderRadius: SIZE.playRadius,
    fontFamily: "'Impact','Arial Black',sans-serif",
    letterSpacing: "0.05em",
  } as const;

  return (
    <div
      className="flex flex-col items-center"
      style={{ width: SIZE.width, gap: SIZE.gap }}
    >
      {posttestRequired ? (
        <button onClick={onPlayClick} className={playClasses} style={playStyle}>
          ▶&nbsp;&nbsp;PLAY NOW
        </button>
      ) : (
        <Link href="/select" className={playClasses} style={playStyle}>
          ▶&nbsp;&nbsp;PLAY NOW
        </Link>
      )}

      {NAV_LINKS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="menu-btn menu-btn-nav flex w-full items-center justify-center border border-[#d4a96a] bg-[#2a1208]/80 font-semibold tracking-wide text-[#f5e6c8] shadow hover:bg-[#3d1a0a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a96a]"
          style={{
            height: SIZE.navHeight,
            fontSize: SIZE.navFont,
            borderRadius: SIZE.navRadius,
          }}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
