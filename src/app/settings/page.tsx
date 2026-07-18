"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getMotionPreference,
  saveMotionPreference,
} from "@/lib/motion-preference";

export default function SettingsPage() {
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setMotionEnabled(getMotionPreference());
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  function handleMotionToggle() {
    setMotionEnabled((currentlyEnabled) => {
      const nextValue = !currentlyEnabled;
      saveMotionPreference(nextValue);
      return nextValue;
    });
  }

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <main
      className="relative flex min-h-screen w-full items-center justify-center bg-cover bg-center px-4"
      style={{ backgroundImage: "url('/assets/backgrounds/main_page_background.png')" }}
    >
      <Link
        href="/home"
        className="absolute left-4 top-4 rounded-lg border border-[#d4a96a] bg-[#2a1208]/90 px-4 py-2 text-sm font-semibold text-[#f5e6c8] transition-colors hover:bg-[#3d1a0a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a96a]"
      >
        ← Back
      </Link>

      <section className="w-full max-w-md rounded-2xl border border-[#d4a96a] bg-[#1a0a04]/90 p-6 text-[#f5e6c8] shadow-2xl backdrop-blur-sm">
        <h1 className="text-2xl font-bold">Settings</h1>

        <div className="mt-6 flex items-center justify-between gap-6 rounded-xl border border-[#6b3520] bg-[#0d0500]/70 p-4">
          <div>
            <h2 className="font-semibold">Background motion</h2>
            <p className="mt-1 text-sm text-[#c8a060]">
              Move the decorative cards on the main menu.
            </p>
          </div>

          <button
            type="button"
            onClick={handleMotionToggle}
            aria-label="Background motion"
            aria-pressed={motionEnabled}
            className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a96a] ${
              motionEnabled
                ? "border-[#80d040] bg-[#3a7d20]"
                : "border-[#6b3520] bg-[#2a1208]"
            }`}
          >
            <span
              aria-hidden="true"
              className={`absolute left-0 top-1 h-6 w-6 rounded-full bg-[#f5e6c8] shadow transition-transform ${
                motionEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <p className="mt-3 text-right text-sm font-semibold text-[#d4a96a]">
          Motion is {motionEnabled ? "on" : "off"}
        </p>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#6b3520] bg-[#2a1208] px-4 text-sm font-semibold tracking-wide text-[#c8873a] transition-colors hover:border-[#c8873a] hover:text-[#f5e6c8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8873a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>{loggingOut ? "Logging out..." : "Logout"}</span>
        </button>
      </section>
    </main>
  );
}
