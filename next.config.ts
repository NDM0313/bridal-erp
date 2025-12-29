import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Turbopack is enabled by default in Next.js 16
  // Mobile app exclusion is handled via tsconfig.json
  turbopack: {},
};

export default nextConfig;
