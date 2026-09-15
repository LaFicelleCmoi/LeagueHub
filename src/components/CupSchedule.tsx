import { CalendarClock, ExternalLink } from "lucide-react";
import { roundStates } from "@/lib/cup-calendar";
import type { CupOverview } from "@/lib/types";

const updatedFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function Empty() {
  return <span className="text-slate-300 dark:text-slate-600">—</span>;
}

// Calendrier officiel complet : dates, tirages, matchs, clubs en lice, entrées et dotations.
export function CupSchedule({ overview }: { overview: CupOverview }) {
  const { calendar, rounds } = overview;
  if (!calendar || rounds.length === 0) return null;

  const states = roundStates(rounds, Date.now());
  const hasDraws = rounds.some((round) => round.draw);
  const hasPrize = rounds.some((round) => round.prize);

  return (
    <section aria-labelledby="cup-schedule-heading" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="cup-schedule-heading" className="text-lg font-semibold">
          Calendrier officiel {overview.season}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Relevé le {updatedFormatter.format(Date.parse(`${calendar.updatedAt}T00:00:00Z`))}
        </p>
      </div>

      {/* `relative` : les textes sr-only (en position absolue) restent dans la zone qui défile. */}
      <div className="relative overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-semibold">
                Tour
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Dates
              </th>
              {hasDraws && (
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Tirage
                </th>
              )}
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                Matchs
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Clubs
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Entrées en lice
              </th>
              {hasPrize && (
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Dotation
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rounds.map((round, index) => {
              const state = states[index];
              const focus = state === "live" || state === "next";
              return (
                <tr
                  key={`${round.key}-${round.start}`}
                  aria-current={focus ? "step" : undefined}
                  className={
                    focus
                      ? "bg-[color-mix(in_srgb,var(--accent)_7%,transparent)]"
                      : state === "done"
                        ? "text-slate-500 dark:text-slate-400"
                        : ""
                  }
                >
                  <th scope="row" className="px-4 py-2.5 align-top font-semibold">
                    <span className="block whitespace-nowrap">{round.label}</span>
                    {focus && (
                      <span className="mt-1 block w-fit rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        {state === "live" ? "En cours" : "Prochain tour"}
                      </span>
                    )}
                  </th>
                  <td className="px-3 py-2.5 align-top">
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      {round.dates ?? "À confirmer"}
                      {round.forecast && state !== "done" && (
                        <>
                          <CalendarClock className="size-3.5 text-slate-400" aria-hidden />
                          <span className="sr-only">(date prévisionnelle)</span>
                        </>
                      )}
                    </span>
                    {round.twoLegged && <span className="block text-xs text-slate-400">Aller-retour</span>}
                    {round.venue && (
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{round.venue}</span>
                    )}
                  </td>
                  {hasDraws && (
                    <td className="whitespace-nowrap px-3 py-2.5 align-top">{round.draw ?? <Empty />}</td>
                  )}
                  <td className="px-3 py-2.5 text-right align-top tabular-nums">{round.fixtures ?? <Empty />}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-top tabular-nums">{round.clubs ?? <Empty />}</td>
                  <td className="min-w-56 px-3 py-2.5 align-top">
                    {round.entries ?? (round.note ? null : <Empty />)}
                    {round.note && (
                      <span className={`block text-xs text-slate-400 ${round.entries ? "mt-0.5" : ""}`}>{round.note}</span>
                    )}
                  </td>
                  {hasPrize && (
                    <td className="whitespace-nowrap px-4 py-2.5 align-top tabular-nums">
                      {round.prize ? (
                        <>
                          <span className="block">Vainqueur {round.prize.winner}</span>
                          {round.prize.loser && (
                            <span className="block text-xs text-slate-400">Perdant {round.prize.loser}</span>
                          )}
                        </>
                      ) : (
                        <Empty />
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
        {calendar.note && <p>{calendar.note}</p>}
        <p className="flex items-start gap-1.5">
          <CalendarClock className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>
            Date prévisionnelle : ESPN n’a pas encore publié les matchs du tour. Les jours réels des matchs remplacent le
            calendrier dès leur publication.
          </span>
        </p>
        <p>
          Sources :{" "}
          {calendar.sources.map((source, index) => (
            <span key={source.url}>
              {index > 0 && ", "}
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900 dark:text-slate-300 dark:decoration-slate-600 dark:hover:text-white"
              >
                {source.label}
                <ExternalLink className="size-3" aria-hidden />
                <span className="sr-only"> (nouvel onglet)</span>
              </a>
            </span>
          ))}
          {calendar.checkedWith.length > 0 && ` · recoupé avec ${calendar.checkedWith.join(", ")}`}
        </p>
      </div>
    </section>
  );
}
