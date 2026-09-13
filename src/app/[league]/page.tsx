import type { Metadata } from "next";
import { LiveIndicator, LiveMatchesProvider } from "@/components/LiveMatches";
import { StandingsTable } from "@/components/StandingsTable";
import { getMatches, getStandings } from "@/lib/espn/api";
import { resolveLeague, type LeaguePageProps } from "@/lib/league-params";
import { selectTrackedMatches } from "@/lib/live";

// Les matchs du jour servent à recalculer le classement en direct.
export const revalidate = 60;

export async function generateMetadata({ params }: LeaguePageProps): Promise<Metadata> {
  const league = await resolveLeague(params);
  return {
    title: `Classement ${league.name}`,
    description: `Classement en direct de la ${league.name} (${league.country}) : points, victoires, buts et zones européennes.`,
  };
}

export default async function StandingsPage({ params }: LeaguePageProps) {
  const league = await resolveLeague(params);
  const now = new Date();
  const [standings, today] = await Promise.all([
    getStandings(league),
    // Sans les scores du jour, le classement officiel s'affiche quand même.
    getMatches(league, now).catch(() => []),
  ]);

  const tracked = selectTrackedMatches(today, now.getTime());
  const sources = tracked.length > 0 ? [{ league: league.slug, matches: tracked }] : [];

  return (
    <LiveMatchesProvider sources={sources}>
      <div className="space-y-4">
        <LiveIndicator />
        <StandingsTable league={league.slug} standings={standings} matches={today} />
      </div>
    </LiveMatchesProvider>
  );
}
