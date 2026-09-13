import type { Metadata } from "next";
import { AutoRefresh } from "@/components/AutoRefresh";
import { MatchCard, MatchDayList } from "@/components/MatchCard";
import { getMatches } from "@/lib/espn/api";
import { addDays } from "@/lib/format";
import { resolveLeague, type LeaguePageProps } from "@/lib/league-params";

export const revalidate = 60;

const PAST_DAYS = 7;
const NEXT_DAYS = 14;

export async function generateMetadata({ params }: LeaguePageProps): Promise<Metadata> {
  const league = await resolveLeague(params);
  return {
    title: `Matchs ${league.name}`,
    description: `Scores en direct, derniers résultats et prochains matchs de la ${league.name}.`,
  };
}

export default async function MatchesPage({ params }: LeaguePageProps) {
  const league = await resolveLeague(params);
  const now = new Date();
  const matches = await getMatches(league, addDays(now, -PAST_DAYS), addDays(now, NEXT_DAYS));

  const live = matches.filter((m) => m.state === "in");
  const upcoming = matches.filter((m) => m.state === "pre");
  const results = matches.filter((m) => m.state === "post").reverse();

  return (
    <div className="space-y-10">
      {live.length > 0 && (
        <section>
          <AutoRefresh seconds={60} />
          <h2 className="mb-4 text-lg font-semibold">En direct</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {live.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-10 lg:grid-cols-2">
        <MatchDayList
          title="Derniers résultats"
          matches={results}
          empty={`Aucun match joué ces ${PAST_DAYS} derniers jours.`}
        />
        <MatchDayList
          title="Prochains matchs"
          matches={upcoming}
          empty={`Aucun match programmé dans les ${NEXT_DAYS} prochains jours.`}
        />
      </div>
    </div>
  );
}
