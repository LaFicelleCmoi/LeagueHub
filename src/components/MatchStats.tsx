import type { MatchDetail } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { TeamLogo } from "./TeamLogo";

// Statistiques des deux équipes fournies par ESPN, avec une barre de comparaison.
export function MatchStats({ detail }: { detail: MatchDetail }) {
  const { match, stats } = detail;

  if (stats.length === 0) {
    return (
      <EmptyState>
        {match.state === "pre"
          ? "Les statistiques s’afficheront pendant le match."
          : "ESPN ne fournit pas de statistiques pour ce match."}
      </EmptyState>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3 text-xs font-semibold">
        <span className="flex min-w-0 items-center gap-1.5">
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-slate-900 dark:bg-white" />
          <TeamLogo team={match.home.team} size={18} />
          <span className="truncate">{match.home.team.shortName}</span>
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">{match.away.team.shortName}</span>
          <TeamLogo team={match.away.team} size={18} />
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-amber-500" />
        </span>
      </div>

      <dl className="space-y-3">
        {stats.map((stat) => (
          <div key={stat.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <dt className="order-2 text-center text-xs text-slate-500 dark:text-slate-400">{stat.label}</dt>
              <dd className="order-1 w-16 font-semibold tabular-nums">
                <span className="sr-only">{match.home.team.name} : </span>
                {stat.home}
              </dd>
              <dd className="order-3 w-16 text-right font-semibold tabular-nums">
                <span className="sr-only">{match.away.team.name} : </span>
                {stat.away}
              </dd>
            </div>
            {stat.share !== null && (
              <div aria-hidden className="mt-1 flex gap-1">
                <div className="flex h-1.5 flex-1 justify-end overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <span className="h-full rounded-full bg-slate-900 dark:bg-white" style={{ width: `${Math.round(stat.share * 100)}%` }} />
                </div>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <span
                    className="block h-full rounded-full bg-amber-500"
                    style={{ width: `${Math.round((1 - stat.share) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}
