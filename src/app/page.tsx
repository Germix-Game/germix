"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AuthPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (res.ok) {
        router.push("/home");
        return;
      }
      setError("Incorrect username or password. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
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
        className="mb-6 h-auto w-[500px] drop-shadow-[2px_4px_10px_rgba(0,0,0,0.6)]"
        style={{ animation: "menu-fade-in 500ms ease-out both" }}
      />

      <form
        onSubmit={handleSubmit}
        className="relative w-[360px] overflow-hidden rounded-3xl border border-[#7a4a1e] bg-[#1a0a04]/90 p-7 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)] backdrop-blur-sm"
        style={{ animation: "menu-fade-in 500ms ease-out 120ms both" }}
      >
        {/* subtle gold accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4a96a]/70 to-transparent" />

        <h1 className="mb-1 text-xl font-bold text-[#f5e6c8]">Log in</h1>
        <p className="mb-6 text-sm text-[#c8a060]">Enter your username and password.</p>

        <label className="mb-1.5 block text-sm font-medium text-[#f5e6c8]">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          autoFocus
          disabled={submitting}
          className="mb-4 w-full rounded-xl border border-[#6b3520] bg-[#0d0500] px-3.5 py-2.5 text-[#f5e6c8] placeholder:text-[#8a6a4a] outline-none transition-colors focus:border-[#d4a96a] focus:ring-2 focus:ring-[#d4a96a]/30 disabled:opacity-60"
        />

        <label className="mb-1.5 block text-sm font-medium text-[#f5e6c8]">Password</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            disabled={submitting}
            className="w-full rounded-xl border border-[#6b3520] bg-[#0d0500] px-3.5 py-2.5 pr-16 text-[#f5e6c8] placeholder:text-[#8a6a4a] outline-none transition-colors focus:border-[#d4a96a] focus:ring-2 focus:ring-[#d4a96a]/30 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#c8a060] transition-colors hover:text-[#f5e6c8]"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-xl bg-gradient-to-b from-[#4da030] to-[#2f6e18] py-3 font-semibold text-white shadow-[0_5px_16px_rgba(58,125,32,0.4)] transition-all hover:from-[#5cb83a] hover:to-[#357d1c] active:translate-y-px disabled:opacity-60"
        >
          {submitting ? "Logging in…" : "Log In"}
        </button>
      </form>
    </div>
  );
}