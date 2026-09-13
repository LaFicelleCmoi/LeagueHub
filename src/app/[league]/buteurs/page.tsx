import type { Metadata } from "next";
import { LeadersTable } from "@/components/LeadersTable";
import { getLeaders } from "@/lib/espn/api";
import { resolveLeague, type LeaguePageProps } from "@/lib/league-params";

export const revalidate = 900;

export async function generateMetadata({ params }: LeaguePageProps): Promise<Metadata> {
  const league = await resolveLeague(params);
  return {
    title: `Buteurs ${league.name}`,
    description: `Meilleurs buteurs et passeurs décisifs de la ${league.name}.`,
  };
}

export default async function LeadersPage({ params }: LeaguePageProps) {
  const league = await resolveLeague(params);
  const { goals, assists } = await getLeaders(league);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <LeadersTable title="Meilleurs buteurs" statAbbr="Buts" statTitle="Buts marqués" leaders={goals} />
      <LeadersTable title="Meilleurs passeurs" statAbbr="PD" statTitle="Passes décisives" leaders={assists} />
    </div>
  );
}
