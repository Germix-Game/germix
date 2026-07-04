"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

// Overlaid credit elements, in filename order (1_ → 6_).
// offsetY nudges an individual element vertically (marginTop).
type CreditElement = {
  src: string;
  alt: string;
  width: number;
  height: number;
  offsetY?: string; // marginTop nudge (shifts layout)
  raise?: string; // translateY, e.g. "-30%" pulls the element up to overlap the one above
  maxW?: string; // overrides the default max width (portrait images need a smaller one)
};

const ELEMENTS: CreditElement[] = [
  { src: "1_game_top.png", alt: "Germix", width: 1803, height: 529, offsetY: "-2rem", raise: "15%" },
  { src: "2_researcher.png", alt: "Researchers", width: 1844, height: 518, offsetY: "-1rem" },
  { src: "3_game_advisor.png", alt: "Advisors", width: 1755, height: 471, offsetY: "-1rem" },
  { src: "4_game_dev.png", alt: "Game Developers", width: 1784, height: 983, offsetY: "-1rem", raise: "0%" },
  { src: "5_designer.png", alt: "Designers", width: 1801, height: 915, offsetY: "-1rem", raise: "-25%" },
  { src: "6_reference_table.png", alt: "References", width: 1249, height: 4505, maxW: "58rem", offsetY: "-1rem", raise: "-5%" },
];

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
      className="relative min-h-screen w-full"
      style={{ backgroundColor: "#2b0d05" }}
    >
      {/* Background artwork — full screen width */}
      <div className="relative w-full">
        <Image
          src="/assets/credit/credit_and_reference_compressed.png"
          alt="Germix Credits & References"
          width={1920}
          height={7997}
          className="h-auto w-full object-contain"
          priority
        />

        {/* Credit elements overlaid, centered with a fixed gap */}
        <div className="absolute inset-0 flex flex-col items-center justify-start gap-8 pt-8">
          {ELEMENTS.map((el) => (
            <Image
              key={el.src}
              src={`/assets/credit/element/${el.src}`}
              alt={el.alt}
              width={el.width}
              height={el.height}
              className="h-auto w-full object-contain"
              style={{
                maxWidth: el.maxW ?? "96rem",
                marginTop: el.offsetY,
                transform: el.raise ? `translateY(${el.raise})` : undefined,
              }}
            />
          ))}
        </div>
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
