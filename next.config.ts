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
};

export default nextConfig;
