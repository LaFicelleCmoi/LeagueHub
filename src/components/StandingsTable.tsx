"use client";

import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { formatGoalDiff } from "@/lib/format";
import { computeLiveStandings, preMatchKey, type LiveResult } from "@/lib/live-standings";
import { goalDiffClass, zoneClass } from "@/lib/standings-style";
import type { Match, Standings } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { useLiveMatches } from "./LiveMatches";
import { TeamLogo } from "./TeamLogo";

function Movement({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="flex items-center text-emerald-600 dark:text-emerald-400" title={`+${value}`}>
        <ArrowUp className="size-3" aria-hidden />
        <span className="sr-only">en progression de {value}</span>
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="flex items-center text-red-600 dark:text-red-400" title={String(value)}>
        <ArrowDown className="size-3" aria-hidden />
        <span className="sr-only">en recul de {-value}</span>
      </span>
    );
  }
  return null;
}

function LiveChip({ result }: { result: LiveResult }) {
  const { match, side } = result;
  const us = match[side];
  const them = match[side === "home" ? "away" : "home"];
  const inPlay = match.state === "in";
  const score = `${us.score ?? 0}-${them.score ?? 0}`;

  return (
    <span
      title={`${inPlay ? "En cours" : "Terminé"} contre ${them.team.name} : ${score}`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
        inPlay
          ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      {inPlay && <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-red-500 motion-reduce:animate-none" />}
      <span className="sr-only">
        {inPlay ? "En cours" : "Terminé, pas encore compté par ESPN"} contre {them.team.name} :
      </span>
      {score}
      {inPlay && <span className="hidden font-normal sm:inline">· {match.status}</span>}
    </span>
  );
}

/** Fait glisser les lignes vers leur nouvelle place quand l'ordre change (technique FLIP). */
function useRowAnimation(order: string) {
  const rows = useRef(new Map<string, HTMLTableRowElement>());
  const positions = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const animate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, number>();
    rows.current.forEach((row, key) => {
      const top = row.offsetTop;
      next.set(key, top);
      const previous = positions.current.get(key);
      if (!animate || previous === undefined || previous === top) return;
      row.style.transition = "none";
      row.style.transform = `translateY(${previous - top}px)`;
      row.getBoundingClientRect(); // applique la position de départ avant la transition
      row.style.transition = "transform 700ms cubic-bezier(0.22, 1, 0.36, 1)";
      row.style.transform = "";
    });
    positions.current = next;
  }, [order]);

  return useCallback(
    (key: string) => (row: HTMLTableRowElement | null) => {
      if (row) rows.current.set(key, row);
      else rows.current.delete(key);
    },
    [],
  );
}

// Colonnes secondaires masquées sur mobile.
const DETAIL_COLUMNS = [
  { key: "wins", abbr: "G", title: "Gagnés" },
  { key: "draws", abbr: "N", title: "Nuls" },
  { key: "losses", abbr: "P", title: "Perdus" },
  { key: "goalsFor", abbr: "BP", title: "Buts pour" },
  { key: "goalsAgainst", abbr: "BC", title: "Buts contre" },
] as const;

// Classement complet, recalculé en direct avec les scores des matchs du jour.
export function StandingsTable({ standings, matches }: { standings: Standings; matches: Match[] }) {
  const liveMatches = useLiveMatches(matches);

  // Nombre de matchs d'avant-match des équipes vues en train de jouer : sert à savoir, une fois
  // le match terminé, si ESPN l'a déjà ajouté à son classement.
  const preMatchPlayed = useRef(new Map<string, number>());
  for (const match of liveMatches) {
    if (match.state !== "in") continue;
    for (const side of [match.home, match.away]) {
      const key = preMatchKey(match.id, side.team.id);
      if (side.played !== null && !preMatchPlayed.current.has(key)) preMatchPlayed.current.set(key, side.played);
    }
  }

  const { rows, provisional } = useMemo(
    () => computeLiveStandings(standings, liveMatches, preMatchPlayed.current),
    [standings, liveMatches],
  );
  const rowRef = useRowAnimation(rows.map((row) => row.team.id).join(","));

  if (standings.rows.length === 0) {
    return <EmptyState>Le classement n’est pas encore disponible.</EmptyState>;
  }

  const zones = [...new Map(standings.rows.flatMap((r) => (r.zone ? [[r.zone.label, r.zone]] : []))).values()];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <h2 className="font-semibold">Classement</h2>
          {provisional && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <span className="relative flex size-1.5" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75 motion-reduce:hidden" />
                <span className="relative inline-flex size-1.5 rounded-full bg-red-500" />
              </span>
              En direct
            </span>
          )}
        </div>
        {standings.season && (
          <p className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Saison {standings.season}
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead className="text-xs text-slate-400 dark:text-slate-500">
            <tr className="border-b border-slate-100 dark:border-slate-800">
              <th scope="col" className="w-16 py-2.5 pl-4 text-left font-medium">
                #
              </th>
              <th scope="col" className="py-2.5 pl-1 text-left font-medium">
                Équipe
              </th>
              <th scope="col" className="px-2 py-2.5 text-right font-medium">
                <abbr title="Matchs joués" className="no-underline">
                  J
                </abbr>
              </th>
              {DETAIL_COLUMNS.map((col) => (
                <th key={col.key} scope="col" className="hidden px-2 py-2.5 text-right font-medium sm:table-cell">
                  <abbr title={col.title} className="no-underline">
                    {col.abbr}
                  </abbr>
                </th>
              ))}
              <th scope="col" className="px-2 py-2.5 text-right font-medium">
                <abbr title="Différence de buts" className="no-underline">
                  Diff
                </abbr>
              </th>
              <th scope="col" className="py-2.5 pl-2 pr-4 text-right font-medium">
                Pts
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {rows.map((row) => (
              <tr
                key={row.team.id}
                ref={rowRef(row.team.id)}
                className={`relative transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                  row.live ? "bg-red-50/50 dark:bg-red-500/[0.06]" : "bg-white dark:bg-slate-900"
                }`}
              >
                <td className="relative py-2 pl-4" title={row.zone?.label}>
                  {row.zone && (
                    <>
                      <span aria-hidden className={`absolute inset-y-2 left-0 w-1 rounded-r-full ${zoneClass(row.zone)}`} />
                      <span className="sr-only">{row.zone.label} : </span>
                    </>
                  )}
                  <span className="flex items-center gap-1">
                    <span
                      className={`inline-grid size-7 place-items-center rounded-lg text-xs font-semibold ${
                        row.rank === 1 ? "bg-[var(--accent)] text-white" : "text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {row.rank}
                    </span>
                    {/* En direct : mouvement par rapport au classement officiel ; sinon, évolution fournie par ESPN. */}
                    <Movement value={provisional ? row.officialRank - row.rank : row.rankChange} />
                  </span>
                </td>
                <td className="py-2 pl-1 pr-3">
                  <div className="flex items-center gap-3">
                    <TeamLogo team={row.team} size={24} />
                    <span className="whitespace-nowrap font-medium">
                      <span className="sm:hidden">{row.team.shortName}</span>
                      <span className="hidden sm:inline">{row.team.name}</span>
                    </span>
                    {row.live && <LiveChip result={row.live} />}
                  </div>
                </td>
                <td className="px-2 text-right text-slate-500 dark:text-slate-400">{row.played}</td>
                {DETAIL_COLUMNS.map((col) => (
                  <td key={col.key} className="hidden px-2 text-right text-slate-500 sm:table-cell dark:text-slate-400">
                    {row[col.key]}
                  </td>
                ))}
                <td className={`px-2 text-right font-medium ${goalDiffClass(row.goalDiff)}`}>
                  {formatGoalDiff(row.goalDiff)}
                </td>
                <td className="py-2 pl-2 pr-4 text-right">
                  <span className="inline-flex items-center justify-end gap-1.5">
                    {row.live && row.live.points > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        +{row.live.points}
                      </span>
                    )}
                    <span className="inline-block min-w-9 rounded-md bg-slate-100 px-1.5 py-0.5 text-center font-bold text-slate-900 dark:bg-slate-800 dark:text-white">
                      {row.points}
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {provisional && (
        <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Classement provisoire, recalculé avec les scores des matchs du jour. En cas d’égalité : points, différence
          de buts puis buts marqués.
        </p>
      )}

      {zones.length > 0 && (
        <ul className="flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
          {zones.map((zone) => (
            <li key={zone.label} className="flex items-center gap-2">
              <span aria-hidden className={`h-3 w-1 rounded-full ${zoneClass(zone)}`} />
              {zone.label}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
