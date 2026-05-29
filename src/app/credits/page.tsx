import Image from "next/image";
import Link from "next/link";

const CREDITS = [
  {
    section: "Game Design & Development",
    entries: [
      { role: "Project Lead", name: "Germix Game Team" },
      { role: "UI/UX Design", name: "Germix Game Team" },
      { role: "Backend Engineering", name: "Germix Game Team" },
    ],
  },
  {
    section: "Academic Content",
    entries: [
      { role: "Microbiology Content", name: "Faculty of Medicine" },
      { role: "Clinical Case Review", name: "Medical Advisors" },
    ],
  },
  {
    section: "References",
    entries: [
      { role: "Textbook", name: "Murray PR et al. — Medical Microbiology, 9th ed." },
      { role: "Textbook", name: "Brooks GF et al. — Jawetz, Melnick & Adelberg's Medical Microbiology, 28th ed." },
      { role: "Guidelines", name: "CDC — Antimicrobial Resistance Threats Report" },
    ],
  },
  {
    section: "Technology",
    entries: [
      { role: "Framework", name: "Next.js — Vercel" },
      { role: "Database ORM", name: "Prisma" },
      { role: "Styling", name: "Tailwind CSS" },
    ],
  },
] as const;

export default function CreditsPage() {
  return (
    <div
      className="min-h-screen w-full bg-cover bg-center px-4 py-8"
      style={{ backgroundImage: "url('/assets/backgrounds/main_page_background.png')" }}
    >
      <div className="mx-auto max-w-2xl">
        {/* Back button */}
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/"
            className="flex h-9 items-center rounded-lg border border-[#d4a96a] bg-[#2a1208]/80 px-4 text-sm font-semibold text-[#f5e6c8] transition-colors hover:bg-[#3d1a0a]"
          >
            ← Back
          </Link>
          <h1
            className="text-2xl font-bold tracking-wide text-[#d4a96a]"
            style={{ fontFamily: "'Impact','Arial Black',sans-serif" }}
          >
            CREDITS &amp; REFERENCES
          </h1>
        </div>

        {/* Team graphic */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-[#d4a96a]/60 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
          <Image
            src="/assets/credit/germix-graphic-game.png"
            alt="Germix Game Team"
            width={1280}
            height={720}
            className="w-full h-auto"
            priority
          />
        </div>

        {/* Credits sections */}
        <div className="space-y-4">
          {CREDITS.map((group) => (
            <div
              key={group.section}
              className="rounded-2xl border border-[#d4a96a]/60 bg-[#1a0a04]/90 px-5 py-4"
            >
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#d4a96a]">
                {group.section}
              </h2>
              <ul className="space-y-2">
                {group.entries.map((entry, i) => (
                  <li key={`${entry.role}-${i}`} className="flex gap-3 text-sm">
                    <span className="w-40 flex-shrink-0 text-[#9a7850]">{entry.role}</span>
                    <span className="text-[#f5e6c8]">{entry.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-[#9a7850]">
          © {new Date().getFullYear()} Germix — Microbiology Card Game. All rights reserved.
        </p>
      </div>
    </div>
  );
}
