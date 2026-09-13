import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ClubDialogProvider } from "@/components/ClubDialogProvider";
import { ClubsLoop } from "@/components/ClubsLoop";
import { EmptyState } from "@/components/EmptyState";
import { FavoriteClubPicker } from "@/components/FavoriteClubPicker";
import { HeroBadge } from "@/components/HeroBadge";
import { LeagueLogo } from "@/components/LeagueLogo";
import { LeagueShortcuts } from "@/components/LeagueShortcuts";
import { LeagueStandingsCard } from "@/components/LeagueStandingsCard";
import { LiveIndicator, LiveMatchesProvider } from "@/components/LiveMatches";
import { MatchCard } from "@/components/MatchCard";
import CountUp from "@/components/reactbits/CountUp";
import SplitFlapText from "@/components/reactbits/SplitFlapText";
import { getMatches, getStandings } from "@/lib/espn/api";
import { formatDay } from "@/lib/format";
import { LEAGUES } from "@/lib/leagues";
import { selectTrackedMatches } from "@/lib/live";
import type { ClubRef } from "@/lib/types";

export const revalidate = 60;

// Grand écran : 3 cartes puis 2 plus larges, sans case vide. Tablette : la 5e prend toute la largeur.
const STANDINGS_SPANS = ["lg:col-span-2", "lg:col-span-2", "lg:col-span-2", "lg:col-span-3", "md:col-span-2 lg:col-span-3"];

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
  const clubs: ClubRef[] = overview.flatMap(
    ({ league, standings }) => standings?.rows.map((row) => ({ team: row.team, league: league.slug })) ?? [],
  );
  const todayMatches = matchDays.flatMap((entry) => entry.today);
  const goalsToday = todayMatches.reduce((sum, m) => sum + (m.home.score ?? 0) + (m.away.score ?? 0), 0);

  const liveSources = matchDays
    .map(({ league, today }) => ({ league: league.slug, matches: selectTrackedMatches(today, now.getTime()) }))
    .filter((source) => source.matches.length > 0);

  const stats = [
    { label: "championnats", value: LEAGUES.length },
    { label: "clubs", value: clubs.length },
    { label: todayMatches.length > 1 ? "matchs aujourd’hui" : "match aujourd’hui", value: todayMatches.length },
    { label: goalsToday > 1 ? "buts marqués aujourd’hui" : "but marqué aujourd’hui", value: goalsToday },
  ];

  return (
    // Fenêtre « 5 derniers matchs » partagée par le bandeau des clubs et les cartes de classement.
    <ClubDialogProvider>
      <div className="space-y-12">
        <section className="grid gap-6 md:grid-cols-[minmax(0,1fr)_240px] md:items-center md:gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Les 5 grands championnats européens</h1>

            {/* Panneau décoratif (les championnats sont cités juste après), dimensionné sur la largeur de sa colonne. */}
            <div aria-hidden="true" className="@container mt-5">
              <SplitFlapText
                words={LEAGUES.map((league) => league.name.toUpperCase())}
                padTo={14}
                fontSize="clamp(12px, 7.8cqi, 44px)"
                gap="0.08em"
                tileRadius={6}
                tileColor="#13295b"
                cycleDelay={2600}
                className="gap-[var(--split-flap-gap)]"
              />
            </div>

            <p className="mt-5 max-w-2xl text-slate-600 dark:text-slate-400">
              Classements, résultats, calendriers, buteurs et actualités de la Premier League, La Liga, Serie A,
              Bundesliga et Ligue 1, réunis au même endroit.
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col-reverse rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
                >
                  <dt className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</dt>
                  <dd className="text-2xl font-bold tabular-nums">
                    <CountUp to={stat.value} duration={1.2} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex flex-col gap-3">
            <HeroBadge />
            <FavoriteClubPicker clubs={clubs} />
          </div>
        </section>

        <LeagueShortcuts />

        {clubs.length > 0 && <ClubsLoop clubs={clubs} />}

        <LiveMatchesProvider sources={liveSources}>
          <section aria-labelledby="today-heading">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="today-heading" className="text-xl font-semibold">
                Matchs du jour
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <LiveIndicator />
                <p className="text-sm text-slate-500 dark:text-slate-400">{formatDay(now)}</p>
              </div>
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
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {today.map((match) => (
                        <MatchCard key={match.id} match={match} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </LiveMatchesProvider>

        <section aria-labelledby="standings-heading">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="standings-heading" className="text-xl font-semibold">
              Classements
            </h2>
            <p aria-hidden className="text-xs text-slate-500 md:hidden dark:text-slate-400">
              Faites défiler →
            </p>
          </div>
          {/* Mobile : carrousel horizontal ; tablette et plus : grille. */}
          <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-3 md:mx-0 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-6">
            {overview.map(({ league, standings }, index) => (
              <div
                key={league.slug}
                className={`w-[85%] max-w-sm shrink-0 snap-start md:w-auto md:max-w-none ${STANDINGS_SPANS[index] ?? "lg:col-span-2"}`}
              >
                <LeagueStandingsCard league={league} standings={standings} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </ClubDialogProvider>
  );
}
