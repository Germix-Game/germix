"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// The main game screen (/play) manages its own orientation/layout handling —
// this guard only covers the surrounding menu/book/leaderboard pages.
const EXCLUDED_PREFIX = "/play";

export function PortraitGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const excluded = pathname?.startsWith(EXCLUDED_PREFIX) ?? false;

  useEffect(() => {
    if (excluded) return;

    const orientation = (screen as Screen & {
      orientation?: ScreenOrientation & { lock?: (o: string) => Promise<void> };
    }).orientation;

    // iOS Safari doesn't implement the Orientation Lock API — this rejects
    // silently there, which is expected and fine to ignore.
    orientation?.lock?.("landscape").catch(() => {});
  }, [excluded]);

  if (excluded) return <>{children}</>;

  return (
    <>
      {children}
      <div
        className="portrait-banner fixed inset-0 z-[70] flex-col items-center justify-center gap-6 bg-[#1a0a04] px-6 text-center text-[#f5e6c8]"
        role="alertdialog"
        aria-modal="true"
        aria-label="Rotate your device"
      >
        <svg
          className="rotate-icon"
          width="72"
          height="72"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="7" y="2" width="10" height="20" rx="2" />
          <line x1="11" y1="18" x2="13" y2="18" />
        </svg>
        <p className="text-lg font-semibold tracking-wide">Rotate your device</p>
        <p className="text-sm text-[#c8a060]">
          This app works best in landscape. Please rotate your device to continue.
        </p>
      </div>
    </>
  );
}
