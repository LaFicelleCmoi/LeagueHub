"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Star } from "lucide-react";
import type { DirectCompetition } from "@/lib/competitions";
import { useFavoriteClub } from "@/lib/favorite-club";
import type { Match } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { useLiveMatches } from "./LiveMatches";
import { MatchCard } from "./MatchCard";
import { ThemedLogo } from "./ThemedLogo";

export interface DirectGroup {
  competition: DirectCompetition;
  matches: Match[];
}

type Filter = "all" | "live" | "upcoming" | "finished" | "favorite";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "live", label: "En direct" },
  { id: "upcoming", label: "À venir" },
  { id: "finished", label: "Terminés" },
  { id: "favorite", label: "Mon club" },
];

// Matchs du jour de toutes les compétitions, filtrables, tenus à jour par le direct.
export function DirectBoard({ groups }: { groups: DirectGroup[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const favorite = useFavoriteClub();
  const all = useMemo(() => groups.flatMap((group) => group.matches), [groups]);
  // Version la plus récente de chaque match : un match qui démarre passe dans « En direct ».
  const live = useLiveMatches(all);
  const current = useMemo(() => new Map(live.map((match) => [match.id, match])), [live]);

  const keep = (match: Match, which: Filter): boolean => {
    const state = (current.get(match.id) ?? match).state;
    switch (which) {
      case "live":
        return state === "in";
      case "upcoming":
        return state === "pre";
      case "finished":
        return state === "post";
      case "favorite":
        return favorite !== null && [match.home.team.id, match.away.team.id].includes(favorite.team.id);
      default:
        return true;
    }
  };

  const counts = Object.fromEntries(FILTERS.map(({ id }) => [id, all.filter((match) => keep(match, id)).length])) as Record<
    Filter,
    number
  >;
  const visible = groups
    .map((group) => ({ ...group, matches: group.matches.filter((match) => keep(match, filter)) }))
    .filter((group) => group.matches.length > 0);

  return (
    <div className="space-y-6">
      <div role="group" aria-label="Filtrer les matchs" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.filter(({ id }) => id !== "favorite" || favorite !== null).map(({ id, label }) => {
          const active = filter === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              {id === "live" && counts.live > 0 && (
                <span aria-hidden className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75 motion-reduce:hidden" />
                  <span className="relative inline-flex size-2 rounded-full bg-red-500" />
                </span>
              )}
              {id === "favorite" && <Star aria-hidden className="size-3.5 fill-amber-400 text-amber-500" />}
              {label}
              <span className={`tabular-nums ${active ? "opacity-80" : "text-slate-400"}`}>{counts[id]}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState>
          {filter === "live"
            ? "Aucun match en cours pour le moment."
            : filter === "favorite"
              ? "Votre club ne joue pas ce jour-là."
              : "Aucun match dans cette sélection."}
        </EmptyState>
      ) : (
        visible.map(({ competition, matches }) => (
          <section key={competition.slug} aria-labelledby={`direct-${competition.slug}`}>
            <div className="mb-3 flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <ThemedLogo light={competition.logo} dark={competition.darkLogo} size={24} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={`direct-${competition.slug}`} className="truncate font-semibold leading-tight">
                  {competition.href ? (
                    <Link href={competition.href} className="inline-flex items-center gap-1 hover:underline">
                      {competition.name}
                      <ChevronRight className="size-4 text-slate-400" aria-hidden />
                    </Link>
                  ) : (
                    competition.name
                  )}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {competition.subtitle} · {matches.length} {matches.length > 1 ? "matchs" : "match"}
                </p>
              </div>
              <span aria-hidden className="h-6 w-1 shrink-0 rounded-full" style={{ backgroundColor: competition.accent }} />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {matches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
