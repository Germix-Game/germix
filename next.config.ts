import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the ngrok tunnel to reach the dev server (Next blocks
  // cross-origin dev requests by default).
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok-free.dev", "*.ngrok.io", "*.ngrok.app"],
};

export default nextConfig;
