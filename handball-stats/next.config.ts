import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration TypeScript path mapping pour la production
  typescript: {
    ignoreBuildErrors: false,
  },
  // Force la résolution des modules
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
