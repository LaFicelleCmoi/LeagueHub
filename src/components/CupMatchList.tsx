import { Zap } from "lucide-react";
import { plural } from "@/lib/league-stats";
import type { CupMatch } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { MatchCard } from "./MatchCard";

/** Exploit : un club hors de la première division élimine un club de l'élite (match unique). */
export function exploitLabel({ match, leg }: CupMatch, topFlight: ReadonlySet<string>): string | null {
  if (match.state !== "post" || leg) return null;
  const winner = match.home.winner ? match.home : match.away.winner ? match.away : null;
  if (!winner) return null;
  const loser = winner === match.home ? match.away : match.home;
  if (topFlight.has(winner.team.id) || !topFlight.has(loser.team.id)) return null;
  return `${winner.team.shortName} élimine ${loser.team.shortName}`;
}

interface CupMatchListProps {
  title: string;
  items: CupMatch[];
  topFlight: ReadonlySet<string>;
  empty: string;
}

// Matchs d'une coupe regroupés par tour (et par manche pour les confrontations aller-retour).
export function CupMatchList({ title, items, topFlight, empty }: CupMatchListProps) {
  const groups: { label: string; items: CupMatch[] }[] = [];
  for (const item of items) {
    const label = [item.round ?? "Autres matchs", item.leg].filter(Boolean).join(" · ");
    const group = groups.find((g) => g.label === label);
    if (group) group.items.push(item);
    else groups.push({ label, items: [item] });
  }

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {groups.length === 0 ? (
        <EmptyState>{empty}</EmptyState>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {group.label}
                <span className="ml-2 font-normal normal-case">
                  · {group.items.length} {plural(group.items.length, "match", "matchs")}
                </span>
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.items.map((item) => {
                  const exploit = exploitLabel(item, topFlight);
                  return (
                    <div key={item.match.id} className="min-w-0 space-y-1.5">
                      {exploit && (
                        <p className="inline-flex max-w-full items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
                          <Zap className="size-3 shrink-0 fill-current" aria-hidden />
                          <span className="truncate">Exploit · {exploit}</span>
                        </p>
                      )}
                      <MatchCard match={item.match} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
