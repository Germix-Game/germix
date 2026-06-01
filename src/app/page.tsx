"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup";

// Your ticket's sign-up rule: 1–10 chars, letters/numbers/underscore/hyphen.
const USERNAME_RE = /^[A-Za-z0-9_-]{1,10}$/;

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Switching tabs should clear any leftover error message.
  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // stop the browser's default "reload the page" on submit

    const value = username.trim();

    if (!USERNAME_RE.test(value)) {
      setError("Username must be 1–10 characters: letters, numbers, _ or -.");
      return; // stop here — don't advance
    }

    setError(null);
    // Carry the choice + username to the next page via the URL.
    router.push(`/login/password?mode=${mode}&username=${encodeURIComponent(value)}`);
  }

  return (
    <div
      className="flex h-screen w-screen items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/assets/backgrounds/main_page_background.png')" }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-[340px] rounded-2xl border border-[#6b3520] bg-[#1a0a04]/90 p-6 shadow-xl"
      >
        {/* ── Tab toggle ─────────────────────────────── */}
        <div className="mb-5 flex gap-2 rounded-xl border border-[#6b3520] bg-[#0d0500] p-1.5">
          <button
            type="button" // not a submit button — just switches tabs
            onClick={() => switchMode("login")}
            className={`flex-1 rounded-lg py-2 font-semibold transition-colors ${
              mode === "login" ? "bg-[#3a7d20] text-white" : "text-[#c8a060]"
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`flex-1 rounded-lg py-2 font-semibold transition-colors ${
              mode === "signup" ? "bg-[#3a7d20] text-white" : "text-[#c8a060]"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* ── Username input ─────────────────────────── */}
        <label className="mb-1.5 block text-sm font-medium text-[#f5e6c8]">
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          autoFocus
          className="w-full rounded-lg border border-[#6b3520] bg-[#0d0500] px-3 py-2 text-[#f5e6c8] outline-none focus:border-[#d4a96a]"
        />

        {/* ── Inline error (only shows when there is one) ── */}
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        {/* ── Submit ─────────────────────────────────── */}
        <button
          type="submit"
          className="mt-5 w-full rounded-lg bg-[#3a7d20] py-2.5 font-semibold text-white transition-colors hover:bg-[#4da030]"
        >
          {mode === "login" ? "Log In" : "Continue"}
        </button>
      </form>
    </div>
  );
}