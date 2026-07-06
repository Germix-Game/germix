import Link from "next/link";
import { Alice } from "next/font/google";

const alice = Alice({ weight: "400", subsets: ["latin"] });

const TABS = [
  { href: "/pathogen-book/bacteria", label: "Bacteria" },
  { href: "/pathogen-book/parasite", label: "Parasite" },
  { href: "/pathogen-book/fungi",    label: "Fungi"    },
  { href: "/pathogen-book/virus",    label: "Virus"    },
];

export default function FungiBookPage() {
  return (
    <div
      className={`${alice.className} relative h-screen w-screen overflow-hidden bg-cover bg-center`}
      style={{
        backgroundImage:
          "url('/assets/pathogen-book/fungi.png'), url('/assets/backgrounds/main_page_background.png')",
        backgroundSize: "auto 100%, cover",
        backgroundRepeat: "no-repeat, no-repeat",
        backgroundPosition: "center, center",
      }}
    >
      {/* Back button */}
      <Link
        href="/home"
        className="absolute left-4 top-4 z-30 flex h-9 items-center rounded-lg border border-[#d4a96a] bg-[#2a1208]/80 px-4 text-sm font-semibold text-[#f5e6c8] transition-colors hover:bg-[#3d1a0a]"
      >
        ← Back
      </Link>

      {/* Tab overlay strip — z-20 so it stays above content */}
      <div
        className="absolute z-20 flex flex-col"
        style={{ left: "13%", top: "8%", width: "5.5vw", height: "49vh" }}
      >
        {TABS.map(({ href, label }) => (
          <Link key={href} href={href} title={label} className="flex-1 rounded hover:bg-white/10" />
        ))}
      </div>

      {/* Coming soon text — z-10 so it stays below tabs */}
      <div
        className="absolute z-10 flex flex-col gap-1"
        style={{ left: "26%", top: "38%" }}
      >
        <p className="text-4xl font-semibold italic text-black">Fungi</p>
        <p className="text-2xl font-medium text-black">Coming Soon</p>
        <p className="text-base text-black/70">This section is under development.</p>
      </div>
    </div>
  );
}
