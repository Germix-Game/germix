"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  DEFAULT_MUSIC_VOLUME,
  MUSIC_PREFERENCE_EVENT,
  getMusicPreference,
  type MusicPreference,
} from "@/lib/music-preference";

const SESSION_TRACK = "/assets/songs/game_session.weba";
const MAIN_TRACK = "/assets/songs/Main.m4a";

const FADE_STEP_MS = 40;
const FADE_STEPS = 10;

function trackForPath(pathname: string): string {
  return pathname.startsWith("/play") ? SESSION_TRACK : MAIN_TRACK;
}

export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTrackRef = useRef<string | null>(null);
  const [preference, setPreference] = useState<MusicPreference>(() =>
    typeof window === "undefined"
      ? { volume: DEFAULT_MUSIC_VOLUME, muted: false }
      : getMusicPreference(),
  );
  const [unlocked, setUnlocked] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    function handlePreferenceChange(e: Event) {
      setPreference((e as CustomEvent<MusicPreference>).detail);
    }

    window.addEventListener(MUSIC_PREFERENCE_EVENT, handlePreferenceChange);
    return () => window.removeEventListener(MUSIC_PREFERENCE_EVENT, handlePreferenceChange);
  }, []);

  // Browsers block audio until the user has interacted with the page, so hold
  // playback until the first gesture instead of letting play() reject.
  useEffect(() => {
    if (unlocked) return;

    function unlock() {
      setUnlocked(true);
    }

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [unlocked]);

  useEffect(() => {
    if (!unlocked) return;

    const audio = audioRef.current;
    if (!audio) return;

    const nextTrack = trackForPath(pathname);
    const targetVolume = preference.muted ? 0 : preference.volume / 100;

    if (currentTrackRef.current === nextTrack) {
      audio.volume = targetVolume;
      if (audio.paused && !preference.muted) void audio.play().catch(() => {});
      return;
    }

    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);

    const startVolume = audio.volume;
    let step = 0;

    function startNextTrack() {
      const el = audioRef.current;
      if (!el) return;
      currentTrackRef.current = nextTrack;
      el.src = nextTrack;
      el.loop = true;
      el.volume = 0;
      void el.play().catch(() => {});

      let inStep = 0;
      fadeTimerRef.current = setInterval(() => {
        const node = audioRef.current;
        if (!node) return;
        inStep += 1;
        node.volume = Math.min(targetVolume, (targetVolume * inStep) / FADE_STEPS);
        if (inStep >= FADE_STEPS && fadeTimerRef.current) {
          clearInterval(fadeTimerRef.current);
          fadeTimerRef.current = null;
        }
      }, FADE_STEP_MS);
    }

    if (currentTrackRef.current === null || startVolume === 0) {
      startNextTrack();
    } else {
      fadeTimerRef.current = setInterval(() => {
        const node = audioRef.current;
        if (!node) return;
        step += 1;
        node.volume = Math.max(0, startVolume * (1 - step / FADE_STEPS));
        if (step >= FADE_STEPS) {
          if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
          fadeTimerRef.current = null;
          startNextTrack();
        }
      }, FADE_STEP_MS);
    }

    return () => {
      if (fadeTimerRef.current) {
        clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    };
  }, [pathname, unlocked, preference]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || fadeTimerRef.current) return;

    audio.volume = preference.muted ? 0 : preference.volume / 100;

    if (preference.muted) {
      audio.pause();
    } else if (unlocked && audio.src && audio.paused) {
      void audio.play().catch(() => {});
    }
  }, [preference, unlocked]);

  return <audio ref={audioRef} loop preload="auto" aria-hidden="true" />;
}
