import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the ngrok tunnel to reach the dev server (Next blocks
  // cross-origin dev requests by default).
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok-free.dev", "*.ngrok.io", "*.ngrok.app"],

  // Without this, /public assets fall back to Next's default (effectively
  // uncached), so every clue-card/background image request re-hits origin
  // instead of being served from Vercel's edge cache or the browser's own
  // cache — the main reason image loads got slow under concurrent load.
  // 1 week + a 1-day stale-while-revalidate window, NOT a full immutable
  // year: art gets swapped in place at the same filename (see CardSlot.tsx),
  // so a cache that never re-checks the origin would hide those swaps for
  // up to a year. If assets move to hashed filenames later, switch this to
  // `public, max-age=31536000, immutable`.
  async headers() {
    return [
      {
        source: "/assets/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
