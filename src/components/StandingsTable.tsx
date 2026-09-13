import { ArrowDown, ArrowUp } from "lucide-react";
import { formatGoalDiff } from "@/lib/format";
import type { Standings, Zone, ZoneTone } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { TeamLogo } from "./TeamLogo";

const ZONE_COLORS: Record<ZoneTone, string> = {
  ucl: "bg-blue-600",
  uel: "bg-orange-500",
  uecl: "bg-emerald-500",
  playoff: "bg-amber-400",
  relegation: "bg-red-600",
  other: "bg-slate-400",
};

function zoneClass(zone: Zone) {
  return `${ZONE_COLORS[zone.tone]} ${zone.qualifying ? "opacity-50" : ""}`;
}

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
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-baseline justify-between gap-4 px-4 py-3">
        <h2 className="font-semibold">Classement</h2>
        {standings.season && <p className="text-sm text-slate-500 dark:text-slate-400">Saison {standings.season}</p>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th scope="col" className="w-14 py-2.5 pl-4 text-left font-medium">
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
              <th scope="col" className="py-2.5 pl-2 pr-4 text-right font-semibold text-slate-700 dark:text-slate-200">
                Pts
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.rows.map((row) => (
              <tr
                key={row.team.id}
                className="border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
              >
                <td className="relative py-2.5 pl-4" title={row.zone?.label}>
                  {row.zone && (
                    <>
                      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${zoneClass(row.zone)}`} />
                      <span className="sr-only">{row.zone.label} : </span>
                    </>
                  )}
                  <span className="flex items-center gap-1 font-semibold">
                    {row.rank}
                    <RankChange value={row.rankChange} />
                  </span>
                </td>
                <td className="py-2.5 pl-1 pr-3">
                  <div className="flex items-center gap-3">
                    <TeamLogo team={row.team} size={24} />
                    <span className="whitespace-nowrap font-medium">
                      <span className="sm:hidden">{row.team.shortName}</span>
                      <span className="hidden sm:inline">{row.team.name}</span>
                    </span>
                  </div>
                </td>
                <td className="px-2 text-right text-slate-600 dark:text-slate-300">{row.played}</td>
                {DETAIL_COLUMNS.map((col) => (
                  <td key={col.key} className="hidden px-2 text-right text-slate-600 sm:table-cell dark:text-slate-300">
                    {row[col.key]}
                  </td>
                ))}
                <td className="px-2 text-right text-slate-600 dark:text-slate-300">{formatGoalDiff(row.goalDiff)}</td>
                <td className="pl-2 pr-4 text-right text-base font-bold">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {zones.length > 0 && (
        <ul className="flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
          {zones.map((zone) => (
            <li key={zone.label} className="flex items-center gap-2">
              <span aria-hidden className={`size-2.5 rounded-full ${zoneClass(zone)}`} />
              {zone.label}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
