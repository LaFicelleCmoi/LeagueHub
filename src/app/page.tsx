import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AutoRefresh } from "@/components/AutoRefresh";
import { EmptyState } from "@/components/EmptyState";
import { LeagueLogo } from "@/components/LeagueLogo";
import { LeagueStandingsCard } from "@/components/LeagueStandingsCard";
import { MatchCard } from "@/components/MatchCard";
import { getMatches, getStandings } from "@/lib/espn/api";
import { formatDay } from "@/lib/format";
import { LEAGUES } from "@/lib/leagues";

export const revalidate = 60;

export default async function HomePage() {
  const now = new Date();

  // allSettled : une ligue indisponible ne doit pas casser toute la page d'accueil.
  const overview = await Promise.all(
    LEAGUES.map(async (league) => {
      const [standings, today] = await Promise.allSettled([getStandings(league), getMatches(league, now)]);
      return {
        league,
        standings: standings.status === "fulfilled" ? standings.value : null,
        today: today.status === "fulfilled" ? today.value : [],
      };
    }),
  );

  const matchDays = overview.filter((entry) => entry.today.length > 0);
  const hasLive = matchDays.some((entry) => entry.today.some((match) => match.state === "in"));

  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Les 5 grands championnats européens</h1>
        <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
          Classements, résultats, calendriers, buteurs et actualités de la Premier League, La Liga, Serie A,
          Bundesliga et Ligue 1, réunis au même endroit.
        </p>
      </section>

      <section aria-labelledby="today-heading">
        {hasLive && <AutoRefresh seconds={60} />}
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4">
          <h2 id="today-heading" className="text-xl font-semibold">
            Matchs du jour
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{formatDay(now)}</p>
        </div>

        {matchDays.length === 0 ? (
          <EmptyState>Aucun match aujourd’hui dans les 5 championnats.</EmptyState>
        ) : (
          <div className="space-y-8">
            {matchDays.map(({ league, today }) => (
              <div key={league.slug}>
                <Link
                  href={`/${league.slug}/matchs`}
                  className="mb-3 inline-flex items-center gap-2 font-semibold hover:underline"
                >
                  <LeagueLogo league={league} size={20} />
                  {league.name}
                  <ChevronRight className="size-4 text-slate-400" aria-hidden />
                </Link>
                <div className="grid gap-3 md:grid-cols-2">
                  {today.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="standings-heading">
        <h2 id="standings-heading" className="mb-4 text-xl font-semibold">
          Classements
        </h2>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {overview.map(({ league, standings }) => (
            <LeagueStandingsCard key={league.slug} league={league} standings={standings} />
          ))}
        </div>
      </section>
    </div>
  );
}
