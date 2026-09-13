import Link from "next/link";
import type { CSSProperties } from "react";
import { ChevronRight } from "lucide-react";
import { formatGoalDiff } from "@/lib/format";
import type { League } from "@/lib/leagues";
import type { Standings } from "@/lib/types";
import { LeagueLogo } from "./LeagueLogo";
import { TeamLogo } from "./TeamLogo";

const TOP = 5;

export function LeagueStandingsCard({ league, standings }: { league: League; standings: Standings | null }) {
  const rows = standings?.rows.slice(0, TOP) ?? [];

  return (
    <article
      style={{ "--accent": league.accent } as CSSProperties}
      className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <div aria-hidden className="h-1 bg-[var(--accent)]" />
      <header className="flex items-center gap-3 px-4 pb-3 pt-4">
        <LeagueLogo league={league} size={32} />
        <div className="min-w-0">
          <h3 className="font-semibold leading-tight">
            <Link href={`/${league.slug}`} className="hover:underline">
              {league.name}
            </Link>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{league.country}</p>
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="flex-1 px-4 py-8 text-center text-sm text-slate-500">Classement indisponible.</p>
      ) : (
        <table className="w-full text-sm tabular-nums">
          <thead className="text-xs text-slate-500 dark:text-slate-400">
            <tr>
              <th scope="col" className="w-10 py-1.5 pl-4 text-left font-medium">
                #
              </th>
              <th scope="col" className="py-1.5 text-left font-medium">
                Équipe
              </th>
              <th scope="col" className="px-2 py-1.5 text-right font-medium">
                <abbr title="Matchs joués" className="no-underline">
                  J
                </abbr>
              </th>
              <th scope="col" className="px-2 py-1.5 text-right font-medium">
                <abbr title="Différence de buts" className="no-underline">
                  Diff
                </abbr>
              </th>
              <th scope="col" className="py-1.5 pl-2 pr-4 text-right font-medium">
                Pts
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.team.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-2 pl-4 font-semibold text-slate-500 dark:text-slate-400">{row.rank}</td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <TeamLogo team={row.team} size={20} />
                    <span className="whitespace-nowrap font-medium">{row.team.shortName}</span>
                  </div>
                </td>
                <td className="px-2 text-right text-slate-500 dark:text-slate-400">{row.played}</td>
                <td className="px-2 text-right text-slate-500 dark:text-slate-400">{formatGoalDiff(row.goalDiff)}</td>
                <td className="pl-2 pr-4 text-right font-bold">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Link
        href={`/${league.slug}`}
        className="mt-auto flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/50"
      >
        Classement complet
        <ChevronRight className="size-4" aria-hidden />
      </Link>
    </article>
  );
}
