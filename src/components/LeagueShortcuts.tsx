import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import type { League, LeagueSlug } from "@/lib/leagues";
import { LeagueLogo } from "./LeagueLogo";
import PixelCard from "./reactbits/PixelCard";

// Nuances de la couleur de chaque ligue (claire → foncée) pour l'effet de pixels.
const PIXEL_COLORS: Record<LeagueSlug, string> = {
  "premier-league": "#ede9fe,#c4b5fd,#7c3aed",
  "la-liga": "#ffedd5,#fdba74,#ea580c",
  "serie-a": "#e0f2fe,#7dd3fc,#0284c7",
  bundesliga: "#fee2e2,#fca5a5,#dc2626",
  "ligue-1": "#dcfce7,#86efac,#16a34a",
  championship: "#dbeafe,#93c5fd,#1d4ed8",
  "segunda-division": "#fae8ff,#f0abfc,#c026d3",
  "serie-b": "#ecfccb,#bef264,#65a30d",
  "2-bundesliga": "#ffe4e6,#fda4af,#e11d48",
  "ligue-2": "#ccfbf1,#5eead4,#0d9488",
};

// Aucune carte orpheline : mobile 2 + 2 + 1 (pleine largeur), tablette 3 + 2, grand écran 5.
const SPANS = ["sm:col-span-2", "sm:col-span-2", "sm:col-span-2", "sm:col-span-3", "col-span-2 sm:col-span-3"];

interface LeagueShortcutsProps {
  leagues: readonly League[];
  heading?: string;
  /** Sous la grille : lien vers l'autre groupe de championnats. */
  footer?: ReactNode;
}

export function LeagueShortcuts({ leagues, heading = "Choisir un championnat", footer }: LeagueShortcutsProps) {
  return (
    <section aria-labelledby="leagues-heading">
      <h2 id="leagues-heading" className="mb-4 text-xl font-semibold">
        {heading}
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-6 lg:grid-cols-5">
        {leagues.map((league, index) => (
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
      {footer && <div className="mt-3">{footer}</div>}
    </section>
  );
}

/** Bandeau-lien vers un groupe de championnats (accueil des deuxièmes divisions, ou retour aux 5 grands). */
export function LeagueGroupLink({
  href,
  title,
  description,
  leagues,
}: {
  href: string;
  title: string;
  description: string;
  leagues: readonly League[];
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition-shadow outline-offset-2 hover:shadow-md focus-visible:outline-2 focus-visible:outline-slate-900 sm:px-5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none dark:focus-visible:outline-white"
    >
      <span aria-hidden className="flex shrink-0 -space-x-1.5 sm:-space-x-1">
        {leagues.map((league) => (
          <span
            key={league.slug}
            className="grid size-7 place-items-center rounded-full bg-white shadow-sm ring-2 ring-white dark:bg-slate-800 dark:ring-slate-900"
          >
            <LeagueLogo league={league} size={18} />
          </span>
        ))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-slate-500 dark:text-slate-400">{description}</span>
      </span>
      <ChevronRight
        className="size-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        aria-hidden
      />
    </Link>
  );
}
