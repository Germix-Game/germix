"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { mockCheckUsername } from "@/lib/mock-auth";

const USERNAME_RE = /^[A-Za-z0-9_-]{1,10}$/;

export default function AuthPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const value = username.trim();
    if (!USERNAME_RE.test(value)) {
      setError("Username must be 1–10 characters: letters, numbers, _ or -.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const result = await mockCheckUsername("login", value);
      if (result.ok) {
        router.push(`/login/password?username=${encodeURIComponent(value)}`);
        return;
      }
      setError(result.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="flex h-screen w-screen flex-col items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/assets/backgrounds/main_page_background.png')" }}
    >
      <Image
        src="/assets/ui/game-logo.png"
        alt="Germix"
        width={800}
        height={300}
        priority
        className="mb-6 h-auto w-[240px] drop-shadow-[2px_4px_10px_rgba(0,0,0,0.6)]"
        style={{ animation: "menu-fade-in 500ms ease-out both" }}
      />

      <form
        onSubmit={handleSubmit}
        className="w-[360px] rounded-3xl border border-[#7a4a1e] bg-[#1a0a04]/90 p-7 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)] backdrop-blur-sm"
        style={{ animation: "menu-fade-in 500ms ease-out 120ms both" }}
      >
        <h1 className="mb-1 text-xl font-bold text-[#f5e6c8]">Log in</h1>
        <p className="mb-6 text-sm text-[#c8a060]">Enter your username to continue.</p>

        <label className="mb-1.5 block text-sm font-medium text-[#f5e6c8]">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          autoFocus
          disabled={submitting}
          className="w-full rounded-xl border border-[#6b3520] bg-[#0d0500] px-3.5 py-2.5 text-[#f5e6c8] placeholder:text-[#8a6a4a] outline-none transition-colors focus:border-[#d4a96a] focus:ring-2 focus:ring-[#d4a96a]/30 disabled:opacity-60"
        />

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-xl bg-[#3a7d20] py-3 font-semibold text-white shadow-[0_4px_14px_rgba(58,125,32,0.4)] transition-all hover:bg-[#4da030] active:translate-y-px disabled:opacity-60"
        >
          {submitting ? "Checking…" : "Log In"}
        </button>
      </form>
    </div>
  );
}