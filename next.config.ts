import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The root layout lives under /[lang], so a site-wide 404 page needs its own file (app/global-not-found.tsx).
  experimental: {
    globalNotFound: true,
    // Payment receipts and transfer confirmations can be up to 5 MB.
    serverActions: { bodySizeLimit: "6mb" },
  },
  // Don't write an AGENTS.md file into the project when running the dev server.
  agentRules: false,
};

export default nextConfig;
