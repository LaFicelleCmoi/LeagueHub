import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { CupLogo } from "@/components/CupLogo";
import { CupMatchList, exploitLabel } from "@/components/CupMatchList";
import { CupRounds } from "@/components/CupRounds";
import { CupsNav } from "@/components/CupsNav";
import { CupsTabNotice } from "@/components/CupsTabSwitch";
import { EmptyState } from "@/components/EmptyState";
import { MatchCard } from "@/components/MatchCard";
import { StatTiles, type Stat } from "@/components/StatTiles";
import { CUPS, getCup } from "@/lib/cups";
import { getCupOverview, getStandings } from "@/lib/espn/api";
import { plural } from "@/lib/league-stats";
import { getLeague } from "@/lib/leagues";

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
    ? { title: cup.name, description: `${cup.name} (${cup.country}) : parcours, résultats, prochains matchs et exploits.` }
    : {};
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
  const current = overview.rounds.find((round) => Date.parse(round.end) > now);

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
      className: "col-span-2 lg:col-span-1",
    },
  ];

  const nothingScheduled = overview.upcoming.length === 0 && overview.results.length === 0;

  return (
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
        {current ? (
          <p className="rounded-full bg-[var(--accent)] px-3 py-1 text-sm font-semibold text-white">
            {current.label}
            {current.dates ? ` · ${current.dates}` : ""}
          </p>
        ) : overview.finished ? (
          <p className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Édition terminée
          </p>
        ) : null}
      </header>

      <StatTiles stats={stats} className="grid-cols-2 lg:grid-cols-3" />

      <CupRounds rounds={overview.rounds} />

      {nothingScheduled ? (
        <section className="space-y-4">
          <EmptyState>
            {overview.finished
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
    </div>
  );
}
