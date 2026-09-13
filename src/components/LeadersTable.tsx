import type { Leader } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

interface LeadersTableProps {
  title: string;
  statAbbr: string;
  statTitle: string;
  leaders: Leader[];
}

export function LeadersTable({ title, statAbbr, statTitle, leaders }: LeadersTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <h2 className="px-4 py-3 font-semibold">{title}</h2>

      {leaders.length === 0 ? (
        <p className="border-t border-slate-100 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800">
          Aucune donnée pour le moment.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th scope="col" className="w-12 py-2.5 pl-4 text-left font-medium">
                  #
                </th>
                <th scope="col" className="py-2.5 text-left font-medium">
                  Joueur
                </th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium">
                  <abbr title="Matchs joués" className="no-underline">
                    MJ
                  </abbr>
                </th>
                <th scope="col" className="py-2.5 pl-2 pr-4 text-right font-semibold text-slate-700 dark:text-slate-200">
                  <abbr title={statTitle} className="no-underline">
                    {statAbbr}
                  </abbr>
                </th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((leader) => (
                <tr key={leader.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-2.5 pl-4 font-semibold text-slate-500 dark:text-slate-400">{leader.rank}</td>
                  <td className="py-2.5 pr-2">
                    <div className="flex items-center gap-3">
                      {leader.team && <TeamLogo team={leader.team} size={24} />}
                      <div>
                        <p className="whitespace-nowrap font-medium">{leader.player}</p>
                        {leader.team && (
                          <p className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">{leader.team.name}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 text-right text-slate-600 dark:text-slate-300">{leader.appearances ?? "–"}</td>
                  <td className="pl-2 pr-4 text-right text-base font-bold">{leader.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
