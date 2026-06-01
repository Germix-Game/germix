"use client";

import { useRouter } from "next/navigation";

export default function LogoutConfirmPage() {
  const router = useRouter();

  async function confirmLogout() {
    try {
      // Clear the server-side session first. The try/catch means that even if
      // this fails (e.g. backend not live yet), we still go to the login screen.
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore — fall through to the redirect either way
    }
    router.push("/");
  }

  return (
    <div
      className="flex h-screen w-screen items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/assets/backgrounds/main_page_background.png')" }}
    >
      <div className="w-[340px] rounded-2xl border border-[#6b3520] bg-[#1a0a04]/90 p-6 text-center shadow-xl">
        <h1 className="mb-2 text-lg font-bold text-[#f5e6c8]">Log out?</h1>
        <p className="mb-5 text-sm text-[#c8a060]">
          Are you sure you want to log out?
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/home")} // Cancel → back to the menu
            className="flex-1 rounded-lg border border-[#6b3520] py-2.5 font-semibold text-[#c8a060] transition-colors hover:bg-[#2a1208]"
          >
            Cancel
          </button>
          <button
            onClick={confirmLogout} // Confirm → log out
            className="flex-1 rounded-lg bg-[#3a7d20] py-2.5 font-semibold text-white transition-colors hover:bg-[#4da030]"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}