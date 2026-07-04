"use client";

import { useEffect, useState } from "react";

export function LandscapeGuard() {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    if (typeof screen !== "undefined" && screen.orientation?.lock) {
      screen.orientation.lock("landscape").catch(() => {});
    }

    const check = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  if (!isPortrait) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-[#1a0a04]/90 backdrop-blur-sm"
      role="alert"
      aria-live="polite"
      aria-label="Please rotate your device to landscape orientation"
    >
      {/* Rotate icon */}
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className="text-[#d4a96a] animate-spin"
        style={{ animationDuration: "3s", animationTimingFunction: "ease-in-out" }}
      >
        <rect x="12" y="18" width="40" height="28" rx="4" stroke="currentColor" strokeWidth="3" />
        <path d="M44 10 C54 10 58 18 58 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M54 12 L58 18 L52 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-xl font-bold text-[#f5e6c8]">Rotate your device</p>
      <p className="text-sm text-[#c8a060] text-center px-8 max-w-xs">
        This game is designed for landscape orientation. Please rotate your device for the best experience.
      </p>
    </div>
  );
}
