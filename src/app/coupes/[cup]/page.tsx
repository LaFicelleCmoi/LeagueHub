import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { CupLogo } from "@/components/CupLogo";
import { CupMatchList, exploitLabel } from "@/components/CupMatchList";
import { CupRounds } from "@/components/CupRounds";
import { CupSchedule } from "@/components/CupSchedule";
import { CupsNav } from "@/components/CupsNav";
import { CupsTabNotice } from "@/components/CupsTabSwitch";
import { EmptyState } from "@/components/EmptyState";
import { LiveIndicator, LiveMatchesProvider } from "@/components/LiveMatches";
import { MatchCard } from "@/components/MatchCard";
import { PageSync } from "@/components/PageSync";
import { StatTiles, type Stat } from "@/components/StatTiles";
import { currentRound, daysUntil } from "@/lib/cup-calendar";
import { CUPS, getCup } from "@/lib/cups";
import { getCupOverview, getStandings } from "@/lib/espn/api";
import { plural } from "@/lib/league-stats";
import { getLeague } from "@/lib/leagues";
import { selectTrackedMatches } from "@/lib/live";
import type { CupOverview } from "@/lib/types";

export const revalidate = 60;
export const dynamicParams = false;

export function generateStaticParams() {
  return CUPS.map((cup) => ({ cup: cup.slug }));
}

interface CupPageProps {
  params: Promise<{ cup: string }>;
}

export async function generateMetadata({ params }: CupPageProps): Promise<Metadata> {
  const cup = getCup((await params).cup);
  return cup
    ? {
        title: cup.name,
        description: `${cup.name} (${cup.country}) : calendrier officiel, parcours, résultats, prochains matchs et exploits.`,
      }
    : {};
}

/** « à partir du 1er tour (sam. 7 nov.) », « à partir des 32es de finale (19–20 déc.) ». */
function espnCoverage(overview: CupOverview): string {
  const round = overview.rounds.find((item) => item.key === overview.calendar?.espnFrom);
  if (!round) return "dès le tirage des premiers tours";
  const many = /^(\d+es |quarts|demi)/i.test(round.label);
  const label = /^\d/.test(round.label) ? round.label : round.label.charAt(0).toLowerCase() + round.label.slice(1);
  return `à partir ${many ? "des" : "du"} ${label}${round.dates ? ` (${round.dates})` : ""}`;
}

export default async function CupPage({ params }: CupPageProps) {
  const cup = getCup((await params).cup);
  const league = cup ? getLeague(cup.league) : undefined;
  if (!cup || !league) notFound();

  const [overview, standings] = await Promise.all([getCupOverview(cup), getStandings(league).catch(() => null)]);
  // Clubs de première division du pays : un club absent de cette liste qui les élimine signe un exploit.
  const topFlight = new Set(standings?.rows.map((row) => row.team.id) ?? []);
  const exploits = overview.results.filter((item) => exploitLabel(item, topFlight)).length;
  const now = Date.now();
  const focus = currentRound(overview.rounds, now);
  const final = overview.rounds.find((round) => round.key === "final" && Date.parse(round.end) > now);

  const stats: Stat[] = [
    {
      label: plural(overview.upcoming.length, "match programmé", "matchs programmés"),
      value: overview.upcoming.length,
      hint: "5 prochains mois",
    },
    {
      label: plural(overview.results.length, "résultat récent", "résultats récents"),
      value: overview.results.length,
      hint: "60 derniers jours",
    },
    {
      label: plural(exploits, "exploit d’un petit poucet", "exploits de petits poucets"),
      value: exploits,
      hint: `Contre un club de ${league.name}`,
      accent: true,
      className: final ? undefined : "col-span-2 lg:col-span-1",
    },
  ];
  if (final) {
    const days = Math.max(0, daysUntil(final.start, now));
    stats.push({
      label: plural(days, "jour avant la finale", "jours avant la finale"),
      value: days,
      hint: [final.dates, final.venue].filter(Boolean).join(" · "),
    });
  }

  const nothingScheduled = overview.upcoming.length === 0 && overview.results.length === 0;

  // Les cartes de match suivent le direct, comme dans les championnats.
  const tracked = selectTrackedMatches(
    [...overview.upcoming, ...overview.results].map((item) => item.match),
    now,
  );
  const liveSources = tracked.length > 0 ? [{ slug: cup.slug, matches: tracked }] : [];

  return (
    <LiveMatchesProvider sources={liveSources}>
      <PageSync renderedAt={now} />
      <div style={{ "--accent": cup.accent } as CSSProperties} className="space-y-8">
        <CupsTabNotice />
        <CupsNav active={cup.slug} />

        <header className="flex flex-wrap items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <CupLogo cup={cup} size={44} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              <span aria-hidden className="h-3 w-1 rounded-full bg-[var(--accent)]" />
              {cup.country}
              {overview.season && ` · Saison ${overview.season}`}
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{cup.name}</h1>
          </div>
          {focus ? (
            <p className="rounded-full bg-[var(--accent)] px-3 py-1 text-sm font-semibold text-white">
              {focus.live ? "En cours" : "Prochain tour"} · {focus.round.label}
              {focus.round.dates ? ` · ${focus.round.dates}` : ""}
            </p>
          ) : overview.finished ? (
            <p className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Édition terminée
            </p>
          ) : null}
        </header>

        <StatTiles
          stats={stats}
          className={stats.length === 4 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-3"}
        />

        <CupRounds rounds={overview.rounds} />

        {nothingScheduled ? (
          <section className="space-y-4">
            <EmptyState>
              {overview.forecast
                ? `ESPN n’a pas encore ouvert l’édition ${overview.season} : ses matchs y apparaîtront ${espnCoverage(overview)}. Le calendrier officiel complet est détaillé plus bas.`
                : overview.finished
                  ? `L’édition ${overview.season} est terminée : la prochaine n’est pas encore programmée par ESPN.`
                  : "Aucun match joué ces 60 derniers jours ni programmé dans les 5 prochains mois."}
            </EmptyState>
            {overview.lastFinal && (
              <div>
                <h2 className="mb-3 text-lg font-semibold">Dernière finale</h2>
                <div className="max-w-md">
                  <MatchCard match={overview.lastFinal.match} />
                </div>
              </div>
            )}
          </section>
        ) : (
          <>
            <LiveIndicator />
            <CupMatchList
              title="Prochains matchs"
              items={overview.upcoming}
              topFlight={topFlight}
              empty="Aucun match programmé dans les 5 prochains mois."
            />
            <CupMatchList
              title="Derniers résultats"
              items={overview.results}
              topFlight={topFlight}
              empty="Aucun match joué ces 60 derniers jours."
            />
          </>
        )}

        <CupSchedule overview={overview} />
      </div>
    </LiveMatchesProvider>
  );
}
