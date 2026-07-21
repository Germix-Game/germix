"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Patrick_Hand } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { ReferenceTable } from "./ReferenceTable";

// Handwritten "student notes" style — used only for the reference-table heading.
const patrickHand = Patrick_Hand({ subsets: ["latin"], weight: "400" });

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

const BG_SRC = "/assets/credit/credit_and_reference_compressed_2.png";

const ELEMENTS: CreditElement[] = [
  { src: "1_game_top.png", alt: "Germix", width: 1803, height: 529, offsetY: "-2rem", raise: "15%" },
  { src: "2_researcher.png", alt: "Researchers", width: 1844, height: 518, offsetY: "-1rem" },
  { src: "3_game_advisor.png", alt: "Advisors", width: 1755, height: 471, offsetY: "-1rem" },
  { src: "4_game_dev.png", alt: "Game Developers", width: 1784, height: 983, offsetY: "-1rem", raise: "0%" },
  { src: "5_designer.png", alt: "Designers", width: 1801, height: 915, offsetY: "-1rem", raise: "-25%" },
];

// Every image that must be loaded before we reveal the page.
const ALL_SRCS = [BG_SRC, ...ELEMENTS.map((el) => `/assets/credit/element/${el.src}`)];

export default function CreditsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/");
    });
  }, [router]);

  // Preload all artwork, then reveal. Fail-safe timeout so a stalled image
  // never traps the user on the loading screen.
  useEffect(() => {
    let remaining = ALL_SRCS.length;
    let done = false;

    const finish = () => {
      if (!done) {
        done = true;
        setReady(true);
      }
    };

    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) finish();
    };

    const imgs = ALL_SRCS.map((src) => {
      const img = new window.Image();
      img.onload = tick;
      img.onerror = tick;
      img.src = src;
      return img;
    });

    const fallback = window.setTimeout(finish, 8000);

    return () => {
      window.clearTimeout(fallback);
      imgs.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, []);

  return (
    <div
      className="relative min-h-screen w-full"
      style={{ backgroundColor: "#2b0d05" }}
    >
      {/* Loading screen */}
      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 ${
          ready ? "credit-loader-out pointer-events-none" : ""
        }`}
        style={{ backgroundColor: "#2b0d05" }}
      >
        <div className="flex items-end gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="credit-dot block h-3 w-3 rounded-full bg-[#e8c98f]"
              style={{ "--dot-delay": `${i * 160}ms` } as React.CSSProperties}
            />
          ))}
        </div>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#e8c98f]/80">
          Loading credits
        </p>
      </div>

      {/* Background artwork — full screen width */}
      <div className="relative w-full">
        <Image
          src={BG_SRC}
          alt="Germix Credits & References"
          width={1920}
          height={8725}
          className={`h-auto w-full object-contain ${ready ? "credit-bg-in" : "opacity-0"}`}
          priority
        />

        {/* Credit elements overlaid, centered with a fixed gap */}
        <div className="absolute inset-0 flex flex-col items-center justify-start gap-8 pt-8">
          {ELEMENTS.map((el, i) => (
            <div
              key={el.src}
              className={`flex w-full justify-center ${ready ? "credit-in" : "opacity-0"}`}
              style={
                {
                  marginTop: el.offsetY,
                  "--credit-delay": `${i * 110}ms`,
                } as React.CSSProperties
              }
            >
              <Image
                src={`/assets/credit/element/${el.src}`}
                alt={el.alt}
                width={el.width}
                height={el.height}
                priority
                className="h-auto w-full object-contain"
                style={{
                  maxWidth: el.maxW ?? "96rem",
                  transform: el.raise ? `translateY(${el.raise})` : undefined,
                }}
              />
            </div>
          ))}

          {/* Reference table heading — also pulls the table + copyright notice
              below it up, since they follow in normal document flow. */}
          <div
            className={`credit-heading-wrap flex w-full justify-center px-4 text-center ${ready ? "credit-in" : "opacity-0"}`}
            style={
              {
                marginTop: "calc(-1rem - 220px)",
                "--credit-delay": `${ELEMENTS.length * 110}ms`,
              } as React.CSSProperties
            }
          >
            <h2
              className={`${patrickHand.className} text-2xl text-black sm:text-5xl md:text-6xl`}
            >
              In-Game Card Photo Credit
            </h2>
          </div>

          {/* References table — real, clickable links instead of a flat image */}
          <div
            className={`flex w-full justify-center ${ready ? "credit-in" : "opacity-0"}`}
            style={
              {
                marginTop: "0.5rem",
                "--credit-delay": `${(ELEMENTS.length + 1) * 110}ms`,
              } as React.CSSProperties
            }
          >
            <ReferenceTable />
          </div>

          {/* Copyright notice */}
          <div
            className={`flex w-full justify-center px-4 pb-12 text-center ${ready ? "credit-in" : "opacity-0"}`}
            style={
              {
                marginTop: "0.5rem",
                "--credit-delay": `${(ELEMENTS.length + 2) * 110}ms`,
              } as React.CSSProperties
            }
          >
            <p className="max-w-3xl text-sm leading-relaxed text-black">
              <span className="font-semibold">Copyright Notice:</span> Images
              used in this project were selected from sources that permit
              educational reuse and have been appropriately attributed where
              required. If you are the copyright owner of any image and would
              like it removed or its attribution corrected, please contact us
              via Email (
              <a
                href="mailto:chonticha.nom@student.mahidol.ac.th"
                className="text-[#1a56db] underline hover:text-[#153fa8]"
              >
                chonticha.nom@student.mahidol.ac.th
              </a>
              )
            </p>
          </div>
        </div>
      </div>

      {/* Back button */}
      <div className="safe-top safe-left fixed z-20">
        <Link
          href="/home"
          className={`tap-min flex items-center rounded-lg border border-[#d4a96a] bg-[#2a1208]/80 px-4 py-2 text-sm font-semibold text-[#f5e6c8] transition-colors hover:bg-[#3d1a0a] ${
            ready ? "credit-back-in" : "opacity-0"
          }`}
        >
          ← Back
        </Link>
      </div>
    </div>
  );
}
