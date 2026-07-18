"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveMotionPreference } from "@/lib/motion-preference";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="4 9 8 9 12 5 12 19 8 15 4 15 4 9" />
      {muted ? (
        <>
          <line x1="16" y1="9" x2="21" y2="14" />
          <line x1="21" y1="9" x2="16" y2="14" />
        </>
      ) : (
        <>
          <path d="M16 8.5a4 4 0 0 1 0 7" />
          <path d="M18.5 6a7.5 7.5 0 0 1 0 12" />
        </>
      )}
    </svg>
  );
}

function VolumeSlider({
  label,
  value,
  muted,
  onChange,
  onToggleMute,
}: {
  label: string;
  value: number;
  muted: boolean;
  onChange: (value: number) => void;
  onToggleMute: () => void;
}) {
  const displayValue = muted ? 0 : value;

  return (
    <div className="rounded-xl border border-[#6b3520] bg-[#0d0500]/70 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{label}</h2>
        <span className="w-10 text-right text-sm tabular-nums text-[#f5e6c8]/70">
          {displayValue}%
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? `Unmute ${label.toLowerCase()}` : `Mute ${label.toLowerCase()}`}
          aria-pressed={muted}
          className="tap-min flex shrink-0 items-center justify-center rounded-full text-[#f5e6c8]/80 transition-colors hover:bg-[#3d1a0a] hover:text-[#f5e6c8]"
        >
          <SpeakerIcon muted={muted} />
        </button>

        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          disabled={muted}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className="settings-slider h-2 flex-1 cursor-pointer appearance-none rounded-full disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: `linear-gradient(to right, #80d040 ${displayValue}%, #3d1a0a ${displayValue}%)`,
          }}
        />
      </div>
    </div>
  );
}

export function SettingsModal({
  motionEnabled,
  onMotionToggle,
  onClose,
}: {
  motionEnabled: boolean;
  onMotionToggle: (enabled: boolean) => void;
  onClose: () => void;
}) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [musicVolume, setMusicVolume] = useState(70);
  const [musicMuted, setMusicMuted] = useState(false);
  const [sfxVolume, setSfxVolume] = useState(80);
  const [sfxMuted, setSfxMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const router = useRouter();
  const dialogRef = useRef<HTMLElement>(null);

  // Focus trap + return focus to the triggering element on close, and lock
  // background scrolling for the duration the dialog is open.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;
    const focusables = () =>
      dialog ? Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : [];
    focusables()[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  useEffect(() => {
    function handleFullscreenChange() {
      setFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  function handleMotionToggle() {
    const nextValue = !motionEnabled;
    saveMotionPreference(nextValue);
    onMotionToggle(nextValue);
  }

  async function handleFullscreenToggle() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fullscreen may be unavailable (e.g. iframe without allowfullscreen); ignore.
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="relative w-full max-w-md rounded-2xl border border-[#d4a96a] bg-[#1a0a04] p-6 text-[#f5e6c8] shadow-2xl max-h-[85vh] overflow-y-auto"
        style={{ animation: "settings-modal-in 180ms ease-out both" }}
      >
        <div className="flex items-center justify-between">
          <h1 id="settings-modal-title" className="text-2xl font-bold">
            Settings
          </h1>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="tap-min flex items-center justify-center rounded-full text-[#f5e6c8]/70 transition-colors hover:bg-[#3d1a0a] hover:text-[#f5e6c8]"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#f5e6c8]/50">
            Sound
          </h3>

          <VolumeSlider
            label="Music Volume"
            value={musicVolume}
            muted={musicMuted}
            onChange={setMusicVolume}
            onToggleMute={() => setMusicMuted((m) => !m)}
          />

          <VolumeSlider
            label="Sound Effects"
            value={sfxVolume}
            muted={sfxMuted}
            onChange={setSfxVolume}
            onToggleMute={() => setSfxMuted((m) => !m)}
          />
        </div>

        <div className="mt-6 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#f5e6c8]/50">
            Display
          </h3>

          <div className="flex items-center justify-between gap-6 rounded-xl border border-[#6b3520] bg-[#0d0500]/70 p-4">
            <h2 className="font-semibold">Floating card animation</h2>

            <button
              type="button"
              onClick={handleMotionToggle}
              aria-label="Floating card animation"
              aria-pressed={motionEnabled}
              className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors ${
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

          <div className="flex items-center justify-between gap-6 rounded-xl border border-[#6b3520] bg-[#0d0500]/70 p-4">
            <h2 className="font-semibold">Fullscreen mode</h2>

            <button
              type="button"
              onClick={handleFullscreenToggle}
              aria-label="Fullscreen mode"
              aria-pressed={fullscreen}
              className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors ${
                fullscreen
                  ? "border-[#80d040] bg-[#3a7d20]"
                  : "border-[#6b3520] bg-[#2a1208]"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute left-0 top-1 h-6 w-6 rounded-full bg-[#f5e6c8] shadow transition-transform ${
                  fullscreen ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#6b3520] bg-[#2a1208] px-4 text-sm font-semibold tracking-wide text-[#c8873a] transition-colors hover:border-[#c8873a] hover:text-[#f5e6c8] disabled:cursor-not-allowed disabled:opacity-50"
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
    </div>
  );
}
