import { ArrowUpRight, Medal, Star, Trophy, type LucideIcon } from "lucide-react";
import { UCL_TRACKER_URL } from "@/lib/external-links";
import { TIME_ZONE } from "@/lib/format";
import type { EuropeanCup, TeamFixture } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

// Identité visuelle des coupes d'Europe : chaque compétition a sa couleur et son icône.
export const EUROPEAN_CUP_STYLES: Record<
  EuropeanCup,
  { short: string; icon: LucideIcon; tag: string; row: string; bar: string; ring: string; card: string }
> = {
  ucl: {
    short: "LDC",
    icon: Star,
    tag: "bg-indigo-950 text-white dark:bg-indigo-300 dark:text-indigo-950",
    row: "bg-indigo-50/80 dark:bg-indigo-400/10",
    bar: "bg-indigo-900 dark:bg-indigo-300",
    ring: "ring-2 ring-indigo-900 ring-offset-1 ring-offset-white dark:ring-indigo-300 dark:ring-offset-slate-900",
    card: "border-indigo-400/30 bg-gradient-to-br from-indigo-950 via-indigo-900 to-blue-700",
  },
  uel: {
    short: "Europa",
    icon: Trophy,
    tag: "bg-orange-500 text-white dark:bg-orange-400 dark:text-orange-950",
    row: "bg-orange-50/80 dark:bg-orange-400/10",
    bar: "bg-orange-500 dark:bg-orange-400",
    ring: "ring-2 ring-orange-500 ring-offset-1 ring-offset-white dark:ring-orange-400 dark:ring-offset-slate-900",
    card: "border-orange-400/30 bg-gradient-to-br from-zinc-950 via-zinc-900 to-orange-700",
  },
  uecl: {
    short: "Conférence",
    icon: Medal,
    tag: "bg-teal-700 text-white dark:bg-teal-300 dark:text-teal-950",
    row: "bg-teal-50/80 dark:bg-teal-400/10",
    bar: "bg-teal-600 dark:bg-teal-300",
    ring: "ring-2 ring-teal-600 ring-offset-1 ring-offset-white dark:ring-teal-300 dark:ring-offset-slate-900",
    card: "border-teal-400/30 bg-gradient-to-br from-zinc-950 via-teal-950 to-teal-600",
  },
};

const fixtureDate = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Pastille d'une coupe d'Europe (icône + nom). */
export function EuropeanCupTag({ cup, label }: { cup: EuropeanCup; label: string }) {
  const style = EUROPEAN_CUP_STYLES[cup];
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none ${style.tag}`}
    >
      <Icon className="size-2.5 fill-current" aria-hidden />
      {label}
    </span>
  );
}

/** Prochain match européen, mis en scène comme une affiche de soirée de coupe d'Europe. */
export function EuropeanFixtureCard({ fixture, cup }: { fixture: TeamFixture; cup: EuropeanCup }) {
  const style = EUROPEAN_CUP_STYLES[cup];
  const Icon = style.icon;

  return (
    <div className={`relative mt-2 overflow-hidden rounded-xl border p-3 text-white shadow-sm ${style.card}`}>
      {/* Icônes décoratives regroupées en haut à droite, à l'écart du texte. */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-24 opacity-15">
        <Icon className="absolute -right-3 -top-3 size-16 fill-current" />
        <Icon className="absolute right-14 top-2 size-3 fill-current" />
      </div>
      <div className="relative pr-8">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/85">
          <Icon className="size-3 fill-current" aria-hidden />
          {fixture.competition}
        </p>
        <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
          <span className="text-xs font-normal text-white/60">{fixture.home ? "vs" : "chez"}</span>
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white dark:bg-slate-950/70">
            <TeamLogo team={fixture.opponent} size={18} />
          </span>
          <span className="truncate">{fixture.opponent.name}</span>
        </p>
        <p className="mt-1.5 text-xs text-white/75">
          {[capitalize(fixtureDate.format(new Date(fixture.date))), fixture.home ? "Domicile" : "Extérieur", fixture.venue]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {cup === "ucl" && (
          <a
            href={UCL_TRACKER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/20 hover:bg-white/25"
          >
            Suivre la LDC sur le tracker
            <ArrowUpRight className="size-3.5" aria-hidden />
            <span className="sr-only">(nouvel onglet)</span>
          </a>
        )}
      </div>
    </div>
  );
}
