import type { NextConfig } from "next";

const METABASE_URL =
  process.env.NEXT_PUBLIC_METABASE_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  // Configuration TypeScript path mapping pour la production
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        // Autorise l'iframe Metabase sur la page statistiques
        source: "/dashboard/clubs/:clubId/statistiques",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-src ${METABASE_URL};`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
