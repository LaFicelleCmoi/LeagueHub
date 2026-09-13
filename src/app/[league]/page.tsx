import type { Metadata } from "next";
import { StandingsTable } from "@/components/StandingsTable";
import { getStandings } from "@/lib/espn/api";
import { resolveLeague, type LeaguePageProps } from "@/lib/league-params";

export const revalidate = 300;

export async function generateMetadata({ params }: LeaguePageProps): Promise<Metadata> {
  const league = await resolveLeague(params);
  return {
    title: `Classement ${league.name}`,
    description: `Classement complet de la ${league.name} (${league.country}) : points, victoires, buts et zones européennes.`,
  };
}

export default async function StandingsPage({ params }: LeaguePageProps) {
  const league = await resolveLeague(params);
  const standings = await getStandings(league);

  return <StandingsTable standings={standings} />;
}
