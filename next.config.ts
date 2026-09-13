import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Logos des clubs, des ligues et photos d'actualité hébergés sur le CDN d'ESPN.
    remotePatterns: [
      { protocol: "https", hostname: "**.espncdn.com" },
      // Certaines photos d'actualité sont servies depuis ce second CDN d'ESPN.
      { protocol: "https", hostname: "espnmedia-cdn.akamaized.net" },
    ],
    // Ces images changent rarement : on les garde une semaine en cache.
    minimumCacheTTL: 60 * 60 * 24 * 7,
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
