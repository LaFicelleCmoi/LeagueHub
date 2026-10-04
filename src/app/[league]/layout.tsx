import type { CSSProperties, ReactNode } from "react";
import { ClubDialogProvider } from "@/components/ClubDialogProvider";
import { LeagueLogo } from "@/components/LeagueLogo";
import { LeagueTabs } from "@/components/LeagueTabs";
import { StatTiles, type Stat } from "@/components/StatTiles";
import { nextMatchDay } from "@/lib/calendar";
import { getMatches, getStandings } from "@/lib/espn/api";
import { daysUntilDay, formatDay, formatTime } from "@/lib/format";
import { resolveLeague, type LeaguePageProps } from "@/lib/league-params";
import { goalsInMatches, goalsPerMatchHint, plural, seasonTotals } from "@/lib/league-stats";
import { LEAGUES } from "@/lib/leagues";

// Seuls les 5 championnats sont générés ; toute autre URL renvoie une 404.
export const dynamicParams = false;

// Les chiffres du jour sont communs à tous les onglets du championnat.
export const revalidate = 60;

export function generateStaticParams() {
  return LEAGUES.map((league) => ({ league: league.slug }));
}

export default async function LeagueLayout({ children, params }: LeaguePageProps & { children: ReactNode }) {
  const league = await resolveLeague(params);
  const now = new Date();

  // Les chiffres clés ne doivent jamais empêcher l'affichage des onglets.
  const [standings, today] = await Promise.all([
    getStandings(league).catch(() => null),
    getMatches(league, now).catch(() => []),
  ]);

  const clubs = standings?.rows.length ?? 0;
  const goalsToday = goalsInMatches(today);
  const season = seasonTotals(standings);

  // Jour sans match : les chiffres du jour (toujours à zéro) laissent la place à la prochaine journée
  // et au leader.
  const next = today.length === 0 ? nextMatchDay([league.slug], now) : null;
  const leader = standings?.rows[0];
  const daysToNext = next ? daysUntilDay(next.day, now) : 0;

  const stats: Stat[] = [
    { label: plural(clubs, "club", "clubs"), value: clubs },
    ...(today.length > 0
      ? [
          { label: plural(today.length, "match aujourd’hui", "matchs aujourd’hui"), value: today.length },
          { label: plural(goalsToday, "but marqué aujourd’hui", "buts marqués aujourd’hui"), value: goalsToday },
        ]
      : [
          ...(next
            ? [
                {
                  label: plural(daysToNext, "jour avant la prochaine journée", "jours avant la prochaine journée"),
                  value: daysToNext,
                  hint: `${formatDay(next.firstKickoff)} · ${formatTime(next.firstKickoff)} · ${next.roundCount} ${plural(next.roundCount, "match", "matchs")}`,
                },
              ]
            : []),
          ...(leader
            ? [{ label: plural(leader.points, "point pour le leader", "points pour le leader"), value: leader.points, hint: leader.team.name }]
            : []),
        ]),
    {
      label: plural(season.goals, "but au total en saison régulière", "buts au total en saison régulière"),
      value: season.goals,
      hint: goalsPerMatchHint(season),
      accent: true,
    },
  ];

  return (
    <div style={{ "--accent": league.accent } as CSSProperties}>
      <div className="mb-6 flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <LeagueLogo league={league} size={44} />
        </div>
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            <span aria-hidden className="h-3 w-1 rounded-full bg-[var(--accent)]" />
            {league.country}
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{league.name}</h1>
        </div>
      </div>

      {standings && <StatTiles stats={stats} className="mb-6 grid-cols-2 lg:grid-cols-4" />}

      <LeagueTabs slug={league.slug} />
      <div className="mt-6">
        <ClubDialogProvider>{children}</ClubDialogProvider>
      </div>
    </div>
  );
}
