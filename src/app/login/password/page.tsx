"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { mockAuth } from "@/lib/mock-auth";

function PasswordForm() {
  const router = useRouter();
  const params = useSearchParams();

  const username = params.get("username") ?? "";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!username) {
    return (
      <div className="w-[340px] rounded-2xl border border-[#6b3520] bg-[#1a0a04]/90 p-6 text-center shadow-xl">
        <p className="mb-3 text-[#f5e6c8]">No username provided.</p>
        <Link href="/" className="text-[#d4a96a] underline">Go back</Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const result = await mockAuth("login", username, password);
      if (result.ok) {
        router.push("/home");
        return;
      }
      setError(result.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-[340px] rounded-2xl border border-[#6b3520] bg-[#1a0a04]/90 p-6 shadow-xl"
    >
      <p className="mb-5 text-sm text-[#c8a060]">
        Signing in as <span className="font-semibold text-[#f5e6c8]">{username}</span>
      </p>

      <label className="mb-1.5 block text-sm font-medium text-[#f5e6c8]">Password</label>
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          autoFocus
          disabled={submitting}
          className="w-full rounded-lg border border-[#6b3520] bg-[#0d0500] px-3 py-2 pr-14 text-[#f5e6c8] outline-none focus:border-[#d4a96a] disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => setShowPassword((s) => !s)}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#c8a060] hover:text-[#f5e6c8]"
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-5 w-full rounded-lg bg-[#3a7d20] py-2.5 font-semibold text-white transition-colors hover:bg-[#4da030] disabled:opacity-60"
      >
        {submitting ? "Please wait…" : "Log In"}
      </button>

      <Link href="/" className="mt-3 block text-center text-sm text-[#c8a060] hover:text-[#d4a96a]">
        ← Use a different username
      </Link>
    </form>
  );
}

export default function PasswordPage() {
  return (
    <div
      className="flex h-screen w-screen items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/assets/backgrounds/main_page_background.png')" }}
    >
      <Suspense fallback={<p className="text-[#c8a060]">Loading…</p>}>
        <PasswordForm />
      </Suspense>
    </div>
  );
}