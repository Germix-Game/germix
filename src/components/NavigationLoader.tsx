"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function NavigationLoader() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"hidden" | "visible" | "fading">("hidden");
  const prevPathname = useRef(pathname);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show overlay when any internal link is clicked
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href || href.startsWith("http") || href.startsWith("mailto") || href.startsWith("#")) return;
      const targetPath = href.split("?")[0].split("#")[0];
      if (targetPath === pathname) return;
      setPhase("visible");
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  // Fade out once the new page pathname lands
  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    setPhase("fading");
    fadeTimer.current = setTimeout(() => setPhase("hidden"), 450);
  }, [pathname]);

  if (phase === "hidden") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#0d0500",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2rem",
        opacity: phase === "fading" ? 0 : 1,
        transition: "opacity 400ms ease",
        pointerEvents: phase === "fading" ? "none" : "all",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/ui/game-logo.png"
        alt="Germix"
        draggable={false}
        style={{
          width: "280px",
          opacity: 0.92,
          filter: "drop-shadow(0 6px 28px rgba(0,0,0,0.85))",
          animation: "menu-fade-in 400ms ease both",
        }}
      />
      <div style={{ display: "flex", gap: "10px" }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#c8873a",
              animation: `loading-bounce 1.1s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
