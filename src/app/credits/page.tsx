"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function CreditsPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/");
    });
  }, [router]);

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center"
      style={{ backgroundColor: "#2b0d05" }}
    >
      {/* Credit & reference artwork */}
      <div className="relative w-full max-w-3xl px-4 py-8">
        <Image
          src="/assets/credit/credit_and_reference_compressed.png"
          alt="Germix Credits & References"
          width={1600}
          height={2000}
          className="h-auto w-full object-contain"
          priority
        />
      </div>

      {/* Back button */}
      <div className="fixed top-4 left-4 z-20">
        <Link
          href="/home"
          className="flex items-center rounded-lg border border-[#d4a96a] bg-[#2a1208]/80 px-4 py-2 text-sm font-semibold text-[#f5e6c8] transition-colors hover:bg-[#3d1a0a]"
        >
          ← Back
        </Link>
      </div>
    </div>
  );
}
