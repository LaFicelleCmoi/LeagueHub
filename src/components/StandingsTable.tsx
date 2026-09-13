import { ArrowDown, ArrowUp } from "lucide-react";
import { formatGoalDiff } from "@/lib/format";
import { goalDiffClass, zoneClass } from "@/lib/standings-style";
import type { Standings } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { TeamLogo } from "./TeamLogo";

function RankChange({ value }: { value: number }) {
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

// Colonnes secondaires masquées sur mobile.
const DETAIL_COLUMNS = [
  { key: "wins", abbr: "G", title: "Gagnés" },
  { key: "draws", abbr: "N", title: "Nuls" },
  { key: "losses", abbr: "P", title: "Perdus" },
  { key: "goalsFor", abbr: "BP", title: "Buts pour" },
  { key: "goalsAgainst", abbr: "BC", title: "Buts contre" },
] as const;

export function StandingsTable({ standings }: { standings: Standings }) {
  if (standings.rows.length === 0) {
    return <EmptyState>Le classement n’est pas encore disponible.</EmptyState>;
  }

  const zones = [...new Map(standings.rows.flatMap((r) => (r.zone ? [[r.zone.label, r.zone]] : []))).values()];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
        <h2 className="font-semibold">Classement</h2>
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
            {standings.rows.map((row) => (
              <tr key={row.team.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
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
                    <RankChange value={row.rankChange} />
                  </span>
                </td>
                <td className="py-2 pl-1 pr-3">
                  <div className="flex items-center gap-3">
                    <TeamLogo team={row.team} size={24} />
                    <span className="whitespace-nowrap font-medium">
                      <span className="sm:hidden">{row.team.shortName}</span>
                      <span className="hidden sm:inline">{row.team.name}</span>
                    </span>
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
                  <span className="inline-block min-w-9 rounded-md bg-slate-100 px-1.5 py-0.5 text-center font-bold text-slate-900 dark:bg-slate-800 dark:text-white">
                    {row.points}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
