import type { NextConfig } from "next";

// In development the page calls the backend through this Next.js server
// (same origin, /api/...). That avoids CORS, and lets a phone on the same
// Wi-Fi use the HTTPS dev server without being blocked for calling plain HTTP.
// In production NEXT_PUBLIC_API_URL points the browser at the deployed backend.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8765";
const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Let phones on the local network open the dev server (npm run dev:phone).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  async rewrites() {
    return isDev ? [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }] : [];
  },
};

export default nextConfig;
