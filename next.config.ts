import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Aucune optimisation d'images Vercel (facturée à la transformation et à la mise en cache) :
    // les logos et les photos sont redimensionnés par ESPN lui-même (voir src/lib/espn-image.ts).
    unoptimized: true,
  },
  // Le service worker doit toujours être relu : une nouvelle version remplace l'ancienne sans délai.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
  // Adresses courtes vers le tracker de la Ligue des champions (même URL que src/lib/external-links.ts).
  async redirects() {
    return ["/ldc", "/ligue-des-champions"].map((source) => ({
      source,
      destination: "https://ldc-2026-2027.vercel.app/",
      permanent: false,
    }));
  },
};

export default nextConfig;
