"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Mode = "login" | "signup";

function PasswordForm() {
  const router = useRouter();
  const params = useSearchParams();

  // Read what page 1 put in the URL. Default to "login" if anything's off.
  const mode: Mode = params.get("mode") === "signup" ? "signup" : "login";
  const username = params.get("username") ?? "";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Guard: if someone opens this page directly with no username, bounce them back.
  if (!username) {
    return (
      <div className="text-center text-[#f5e6c8]">
        <p className="mb-3">No username provided.</p>
        <Link href="/" className="text-[#d4a96a] underline">Go back</Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Sign Up: enforce the 6–72 rule (matches passwordSchema) before calling the server.
    if (mode === "signup" && (password.length < 6 || password.length > 72)) {
      setError("Password must be 6–72 characters.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setError(null);
    setSubmitting(true); // loading state ON
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.push("/home"); // success → into the app
        return;
      }

      // Failed: read the server's error envelope ({ error: { message } })
      const data = await res.json().catch(() => null);
      if (mode === "login") {
        // Username was already format-checked; a failure here means wrong password.
        setError("Incorrect password. Please try again.");
      } else {
        // Sign up: surface the server's message (not whitelisted / already exists / etc.)
        setError(data?.error?.message ?? "Could not create your account. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false); // loading state OFF, whatever happened
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-[340px] rounded-2xl border border-[#6b3520] bg-[#1a0a04]/90 p-6 shadow-xl"
    >
      <h1 className="mb-1 text-lg font-bold text-[#f5e6c8]">
        {mode === "login" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mb-5 text-sm text-[#c8a060]">
        {mode === "login" ? "Signing in as" : "Setting a password for"}{" "}
        <span className="font-semibold text-[#f5e6c8]">{username}</span>
      </p>

      <label className="mb-1.5 block text-sm font-medium text-[#f5e6c8]">Password</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoFocus
        disabled={submitting}
        className="w-full rounded-lg border border-[#6b3520] bg-[#0d0500] px-3 py-2 text-[#f5e6c8] outline-none focus:border-[#d4a96a] disabled:opacity-60"
      />

      {mode === "signup" && (
        <p className="mt-1.5 text-xs text-[#c8a060]">Must be 6–72 characters.</p>
      )}

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-5 w-full rounded-lg bg-[#3a7d20] py-2.5 font-semibold text-white transition-colors hover:bg-[#4da030] disabled:opacity-60"
      >
        {submitting ? "Please wait…" : mode === "login" ? "Log In" : "Sign Up"}
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
      {/* Suspense boundary required because PasswordForm uses useSearchParams */}
      <Suspense fallback={<p className="text-[#c8a060]">Loading…</p>}>
        <PasswordForm />
      </Suspense>
    </div>
  );
}