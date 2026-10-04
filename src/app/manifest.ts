import type { MetadataRoute } from "next";

// Manifeste de l'application : LeagueHub s'installe sur l'écran d'accueil et s'ouvre en plein écran.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LeagueHub — Les 5 grands championnats européens",
    short_name: "LeagueHub",
    description:
      "Scores en direct, classements, calendriers, coupes et palmarès des 5 grands championnats européens.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#020617",
    theme_color: "#13295b",
    categories: ["sports", "news"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Direct", short_name: "Direct", url: "/direct", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Coupes nationales", short_name: "Coupes", url: "/coupes", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
