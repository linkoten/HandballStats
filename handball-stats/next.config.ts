import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration TypeScript path mapping pour la production
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
