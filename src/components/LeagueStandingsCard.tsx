import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { formatGoalDiff } from "@/lib/format";
import type { League } from "@/lib/leagues";
import { goalDiffClass, zoneClass } from "@/lib/standings-style";
import type { Standings } from "@/lib/types";
import { ClubButton } from "./ClubDialogProvider";
import { LeagueLogo } from "./LeagueLogo";
import SpotlightCard from "./reactbits/SpotlightCard";
import { TeamLogo } from "./TeamLogo";

const TOP = 5;

function withAlpha(hex: string, alpha: number): `rgba(${number}, ${number}, ${number}, ${number})` {
  const rgb = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(rgb >> 16) & 255}, ${(rgb >> 8) & 255}, ${rgb & 255}, ${alpha})`;
}

export function LeagueStandingsCard({ league, standings }: { league: League; standings: Standings | null }) {
  const rows = standings?.rows.slice(0, TOP) ?? [];

  return (
    <SpotlightCard
      spotlightColor={withAlpha(league.accent, 0.16)}
      className="h-full rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
    >
      {/* `relative` place le contenu au-dessus du halo lumineux. */}
      <article style={{ "--accent": league.accent } as CSSProperties} className="relative flex h-full flex-col">
        <header className="relative flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
          <div
            aria-hidden
            className="absolute inset-0 rounded-t-2xl bg-[linear-gradient(110deg,color-mix(in_srgb,var(--accent)_14%,transparent),transparent_65%)]"
          />
          <div className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:ring-slate-700">
            <LeagueLogo league={league} size={26} />
          </div>
          <div className="relative min-w-0 flex-1">
            <h3 className="truncate font-semibold leading-tight">
              <Link href={`/${league.slug}`} className="hover:underline">
                {league.name}
              </Link>
            </h3>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {league.country}
              {standings?.season ? ` · ${standings.season}` : ""}
            </p>
          </div>
          <span aria-hidden className="relative h-7 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
        </header>

        {rows.length === 0 ? (
          <p className="flex-1 px-4 py-8 text-center text-sm text-slate-500">Classement indisponible.</p>
        ) : (
          <table className="w-full text-[13px] tabular-nums">
            <thead className="text-[11px] text-slate-400 dark:text-slate-500">
              <tr>
                <th scope="col" className="w-11 py-2 pl-4 text-left font-medium">
                  #
                </th>
                <th scope="col" className="py-2 text-left font-medium">
                  Équipe
                </th>
                <th scope="col" className="w-8 px-1 py-2 text-right font-medium">
                  <abbr title="Matchs joués" className="no-underline">
                    J
                  </abbr>
                </th>
                <th scope="col" className="w-11 px-1 py-2 text-right font-medium">
                  <abbr title="Différence de buts" className="no-underline">
                    Diff
                  </abbr>
                </th>
                <th scope="col" className="w-14 py-2 pl-1 pr-4 text-right font-medium">
                  Pts
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {rows.map((row) => (
                <tr
                  key={row.team.id}
                  className="transition-colors hover:bg-slate-50/80 has-[[data-favorite]]:bg-amber-50 dark:hover:bg-slate-800/40 dark:has-[[data-favorite]]:bg-amber-400/[0.08]"
                >
                  <td className="relative py-2 pl-4" title={row.zone?.label}>
                    {row.zone && (
                      <>
                        <span aria-hidden className={`absolute inset-y-2 left-0 w-[3px] rounded-r-full ${zoneClass(row.zone)}`} />
                        <span className="sr-only">{row.zone.label} : </span>
                      </>
                    )}
                    <span
                      className={`inline-grid size-6 place-items-center rounded-md text-xs font-semibold ${
                        row.rank === 1 ? "bg-[var(--accent)] text-white" : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {row.rank}
                    </span>
                  </td>
                  {/* max-w-0 : la colonne prend la place restante et tronque les noms trop longs. */}
                  <td className="max-w-0 py-2 pr-2">
                    <ClubButton
                      club={{ team: row.team, league: league.slug }}
                      className="flex w-full min-w-0 items-center gap-2.5"
                    >
                      <TeamLogo team={row.team} size={22} />
                      <span className="truncate font-medium">{row.team.shortName}</span>
                    </ClubButton>
                  </td>
                  <td className="px-1 text-right text-slate-500 dark:text-slate-400">{row.played}</td>
                  <td className={`px-1 text-right font-medium ${goalDiffClass(row.goalDiff)}`}>
                    {formatGoalDiff(row.goalDiff)}
                  </td>
                  <td className="py-2 pl-1 pr-4 text-right">
                    <span className="inline-block min-w-8 rounded-md bg-slate-100 px-1.5 py-0.5 text-center font-bold text-slate-900 dark:bg-slate-800 dark:text-white">
                      {row.points}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <Link
          href={`/${league.slug}`}
          className="group mt-auto flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:text-white"
        >
          Classement complet
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </article>
    </SpotlightCard>
  );
}
