import { groupByDay } from "@/lib/format";
import type { Match } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { MatchCard } from "./MatchCard";

export function MatchDayList({ title, matches, empty }: { title: string; matches: Match[]; empty: string }) {
  const days = groupByDay(matches);

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {days.length === 0 ? (
        <EmptyState>{empty}</EmptyState>
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <div key={day.key}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {day.label}
              </h3>
              <div className="space-y-3">
                {day.items.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
