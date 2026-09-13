import Link from "next/link";
import type { CSSProperties } from "react";
import { LEAGUES, type LeagueSlug } from "@/lib/leagues";
import { LeagueLogo } from "./LeagueLogo";
import PixelCard from "./reactbits/PixelCard";

// Nuances de la couleur de chaque ligue (claire → foncée) pour l'effet de pixels.
const PIXEL_COLORS: Record<LeagueSlug, string> = {
  "premier-league": "#ede9fe,#c4b5fd,#7c3aed",
  "la-liga": "#ffedd5,#fdba74,#ea580c",
  "serie-a": "#e0f2fe,#7dd3fc,#0284c7",
  bundesliga: "#fee2e2,#fca5a5,#dc2626",
  "ligue-1": "#dcfce7,#86efac,#16a34a",
};

// Aucune carte orpheline : mobile 2 + 2 + 1 (pleine largeur), tablette 3 + 2, grand écran 5.
const SPANS = ["sm:col-span-2", "sm:col-span-2", "sm:col-span-2", "sm:col-span-3", "col-span-2 sm:col-span-3"];

export function LeagueShortcuts() {
  return (
    <section aria-labelledby="leagues-heading">
      <h2 id="leagues-heading" className="mb-4 text-xl font-semibold">
        Choisir un championnat
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-6 lg:grid-cols-5">
        {LEAGUES.map((league, index) => (
          <li
            key={league.slug}
            style={{ "--pixel-card-active-color": `${league.accent}26` } as CSSProperties}
            className={`${SPANS[index] ?? "sm:col-span-2"} lg:col-span-1 [--pixel-card-background:#ffffff] [--pixel-card-border:#e2e8f0] dark:[--pixel-card-background:#0f172a] dark:[--pixel-card-border:#1e293b]`}
          >
            <PixelCard
              colors={PIXEL_COLORS[league.slug]}
              gap={6}
              speed={30}
              noFocus
              className="h-28 w-full rounded-2xl sm:h-32 lg:h-36"
            >
              <Link
                href={`/${league.slug}`}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 rounded-2xl px-2 text-center outline-offset-2 focus-visible:outline-2 focus-visible:outline-slate-900 dark:focus-visible:outline-white"
              >
                <LeagueLogo league={league} size={36} />
                <span className="text-sm font-semibold sm:text-base">{league.name}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{league.country}</span>
              </Link>
            </PixelCard>
          </li>
        ))}
      </ul>
    </section>
  );
}
