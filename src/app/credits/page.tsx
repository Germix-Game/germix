"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Alice } from "next/font/google";
import { createClient } from "@/utils/supabase/client";

const alice = Alice({ weight: "400", subsets: ["latin"] });

const RESEARCHERS = [
  "Chonticha Nopmaneejumruslers",
  "Keerada Keeratihuttyakorn",
  "Chatakarn Surawatanawisase",
  "Veerin Banjongpru",
];

const ADVISORS = [
  "AJ. Aekkacha Moonwiriyakit",
  "AJ. Thachawech Kimprasit",
  "AJ. Suthan Srisangkaew",
];

const ILLUSTRATORS = ["Akikun"];

const REFERENCES = [
  { label: "Textbook", title: "X" },
  { label: "Textbook", title: "X" },
  { label: "Guidelines", title: "X" },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="mb-3 text-sm font-bold uppercase tracking-widest text-black"
      style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}
    >
      {children}
    </h2>
  );
}

function ReferenceList({ entries }: { entries: readonly { label: string; title: string }[] }) {
  return (
    <ul className="flex flex-col items-center gap-2">
      {entries.map((ref, i) => (
        <li key={i} className="flex flex-col items-center leading-tight">
          <span className="text-[11px] uppercase tracking-wider text-black/50">{ref.label}</span>
          <span className="text-[13px] font-semibold text-black text-center">{ref.title}</span>
        </li>
      ))}
    </ul>
  );
}

function EntryList({ entries }: { entries: readonly string[] }) {
  return (
    <ul className="flex flex-col items-center gap-1.5">
      {entries.map((name, i) => (
        <li key={i} className="text-base font-semibold text-black leading-tight">
          {name}
        </li>
      ))}
    </ul>
  );
}

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
      className={`${alice.className} relative min-h-screen w-full bg-cover bg-center`}
      style={{ backgroundImage: "url('/assets/backgrounds/main_page_background.png')" }}
    >
      {/* Game graphic — 80% wide, centered, behind text */}
      <div className="absolute inset-0 flex justify-center">
        <div className="relative w-4/5 h-full">
          <Image
            src="/assets/credit/germix-graphic-game.png"
            alt="Germix Credits"
            fill
            className="object-contain object-top"
            priority
          />
        </div>
      </div>

      {/* Credits overlay */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-end pb-4 px-4">
        {/* 2-column grid */}
        <div className="w-full max-w-lg grid grid-cols-2 gap-x-8 gap-y-6 text-center">
          {/* Left: Researchers */}
          <div className="flex flex-col items-center">
            <SectionTitle>Researchers</SectionTitle>
            <EntryList entries={RESEARCHERS} />
          </div>

          {/* Right: Advisors */}
          <div className="flex flex-col items-center">
            <SectionTitle>Advisors</SectionTitle>
            <EntryList entries={ADVISORS} />
          </div>

          {/* Bottom: Illustrator — spans both columns */}
          <div className="col-span-2 flex flex-col items-center">
            <SectionTitle>Illustrator</SectionTitle>
            <EntryList entries={ILLUSTRATORS} />
          </div>

          {/* Bottom: Academic References — spans both columns */}
          <div className="col-span-2 flex flex-col items-center">
            <SectionTitle>Academic References</SectionTitle>
            <ReferenceList entries={REFERENCES} />
          </div>
        </div>

        <p className="mt-5 text-[13px] text-black/40">
          © {new Date().getFullYear()} Germix — Microbiology Card Game. All rights reserved.

        </p>
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
