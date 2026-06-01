import Link from "next/link";

const NAV_LINKS = [
  { label: "HOW TO PLAY",          href: "/how-to-play"  },
  { label: "LEADERBOARD",          href: "/leaderboard"  },
  { label: "PATHOGEN BOOK",        href: "/pathogen-book"},
  { label: "CREDITS & REFERENCES", href: "/credits"      },
  { label: "log out"             , href: "/logout"} // If you think it's not important, this can be removed. 
] as const;

export function MenuButtons() {
  return (
    <div className="flex flex-col items-center gap-2.5 w-[240px]">
      <Link
        href="/select"
        className="flex h-[62px] w-full items-center justify-center rounded-[18px] border-2 border-[#265215] bg-[#3a7d20] text-[26px] text-white shadow-[3px_4px_8px_rgba(0,0,0,0.4)] transition-colors hover:border-[#80d040] hover:bg-[#4da030] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80d040]"
        style={{ fontFamily: "'Impact','Arial Black',sans-serif", letterSpacing: "0.05em" }}
      >
        ▶&nbsp;&nbsp;PLAY NOW
      </Link>

      {NAV_LINKS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex h-11 w-full items-center justify-center rounded-xl border border-[#d4a96a] bg-[#2a1208]/80 text-sm font-semibold tracking-wide text-[#f5e6c8] shadow transition-colors hover:bg-[#3d1a0a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a96a]"
        >
          {item.label}
        </Link>
      ))}

    </div>
  );
}
