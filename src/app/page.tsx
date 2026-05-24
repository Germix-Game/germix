// Import Next.js's built-in Image component — optimizes images automatically
// (lazy loading, responsive sizes, modern formats like WebP). Always prefer this over plain <img>.
import Image from "next/image";

// `export default` = the main thing this file gives to Next.js.
// In the App Router, the default export of `page.tsx` IS the page that renders at this route.
// This file is at `src/app/page.tsx` → it renders at the root URL "/"
// `function Home()` — name can be anything; "Home" is convention for the root page.
export default function Home() {
  // React components return JSX (HTML-like syntax that compiles to JS function calls).
  // Everything inside `return ( ... )` is what gets rendered to the browser.
  return (
    // OUTER WRAPPER — full-screen flex container
    // flex flex-col       → vertical stacking
    // flex-1              → fills available height
    // items-center        → horizontal centering
    // justify-center      → vertical centering
    // bg-zinc-50          → very light grey background (light mode)
    // dark:bg-black       → black background when dark mode is on
    // font-sans           → use the project's sans-serif font (set in layout.tsx)
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">

      {/* MAIN CONTENT BOX — the centered card holding everything */}
      {/* max-w-3xl  → caps width so it doesn't stretch on huge screens */}
      {/* py-32 px-16 → vertical padding 32 units, horizontal padding 16 units */}
      {/* sm:items-start → on small+ screens, left-align instead of center */}
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">

        {/* NEXT.JS LOGO at the top */}
        {/* dark:invert → in dark mode, flip black→white so the logo stays visible */}
        {/* src="/next.svg" → file in the `public/` folder, served at root URL */}
        {/* width/height → REQUIRED by next/image (prevents layout shift) */}
        {/* priority → tells Next to load this image immediately (it's above the fold) */}
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />

        {/* HEADING + PARAGRAPH BLOCK */}
        {/* gap-6 → spacing between child elements (h1 and p) */}
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">

          {/* MAIN HEADING */}
          {/* text-3xl  → font size large */}
          {/* font-semibold → bold-ish */}
          {/* tracking-tight → tighter letter spacing */}
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            To get started, edit the page.tsx file.
          </h1>

          {/* DESCRIPTIVE PARAGRAPH with inline links */}
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Head over to{" "}
            {/* {" "} → JSX trick to preserve a single space between text and the next element */}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Learning
            </a>{" "}
            center.
          </p>
        </div>

        {/* BUTTON ROW — Deploy + Documentation links */}
        {/* flex-col on mobile → stacked vertically */}
        {/* sm:flex-row → side-by-side on screens ≥640px */}
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">

          {/* "Deploy Now" BUTTON — primary (filled) style */}
          {/* h-12 → height 48px */}
          {/* rounded-full → pill shape */}
          {/* bg-foreground / text-background → uses CSS variables for theme colors */}
          {/* hover:bg-[#383838] → dark grey on hover */}
          {/* md:w-[158px] → fixed width on medium+ screens */}
          {/* target="_blank" → open in new tab */}
          {/* rel="noopener noreferrer" → security best practice when using target=_blank */}
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* Vercel logo inside the button */}
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
            />
            Deploy Now
          </a>

          {/* "Documentation" BUTTON — secondary (outlined) style */}
          {/* border border-solid → 1px solid border */}
          {/* border-black/[.08] → 8% opacity black border (very subtle) */}
          {/* hover:bg-black/[.04] → faint hover background */}
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
