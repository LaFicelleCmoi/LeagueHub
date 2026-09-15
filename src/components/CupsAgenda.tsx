import Link from "next/link";
import type { CSSProperties } from "react";
import { CalendarClock, Trophy } from "lucide-react";
import { currentRound, daysUntil } from "@/lib/cup-calendar";
import type { Cup } from "@/lib/cups";
import { dayKey, formatDay } from "@/lib/format";
import type { CupOverview } from "@/lib/types";
import { CupLogo } from "./CupLogo";

const DAY = 86_400_000;

function countdown(days: number): string {
  if (days <= 0) return "Aujourd’hui";
  if (days === 1) return "Demain";
  return `Dans ${days} jours`;
}

// Agenda de la page Coupes : prochain tour de chaque coupe et compte à rebours des finales.
export function CupsAgenda({ items }: { items: { cup: Cup; overview: CupOverview | null }[] }) {
  const now = Date.now();

  const next = items
    .flatMap(({ cup, overview }) => {
      const focus = overview ? currentRound(overview.rounds, now) : null;
      return focus ? [{ cup, ...focus }] : [];
    })
    .sort((a, b) => Date.parse(a.round.start) - Date.parse(b.round.start));

  const finals = items
    .flatMap(({ cup, overview }) => {
      const round = overview?.rounds.find((item) => item.key === "final" && Date.parse(item.end) > now);
      return round ? [{ cup, round }] : [];
    })
    .sort((a, b) => Date.parse(a.round.start) - Date.parse(b.round.start));

  if (next.length === 0 && finals.length === 0) return null;

  const span =
    finals.length > 1 ? Math.round((Date.parse(finals[finals.length - 1].round.start) - Date.parse(finals[0].round.start)) / DAY) : 0;

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      {next.length > 0 && (
        <section
          aria-labelledby="cups-next-heading"
          className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 lg:col-span-3 dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 id="cups-next-heading" className="text-lg font-semibold">
            Prochaines échéances
          </h2>
          <ol className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {next.map(({ cup, round, live }) => (
              <li key={cup.slug}>
                <Link
                  href={`/coupes/${cup.slug}`}
                  style={{ "--accent": cup.accent } as CSSProperties}
                  className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                    <CupLogo cup={cup} size={26} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{round.label}</span>
                    <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                      {cup.name} · {round.dates ?? "Dates à confirmer"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs">
                    {live ? (
                      <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 font-semibold text-white">En cours</span>
                    ) : (
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        {countdown(daysUntil(round.start, now))}
                      </span>
                    )}
                    {round.forecast && (
                      <span className="mt-1 flex items-center justify-end gap-1 text-slate-400">
                        <CalendarClock className="size-3" aria-hidden />
                        Prévu<span className="sr-only"> au calendrier officiel</span>
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {finals.length > 0 && (
        <section
          aria-labelledby="cups-finals-heading"
          className="rounded-2xl border border-amber-300/60 bg-gradient-to-br from-amber-50 to-white p-4 sm:p-5 lg:col-span-2 dark:border-amber-500/20 dark:from-amber-500/10 dark:to-slate-900"
        >
          <h2 id="cups-finals-heading" className="flex items-center gap-2 text-lg font-semibold">
            <Trophy className="size-5 text-amber-500" aria-hidden />
            Les finales
          </h2>
          {span > 0 && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {finals.length} finales en {span} jours.
            </p>
          )}
          <ol className="mt-4 space-y-4 border-l-2 border-amber-300/70 pl-5 dark:border-amber-500/30">
            {finals.map(({ cup, round }) => (
              <li key={cup.slug} className="relative">
                <span
                  aria-hidden
                  style={{ backgroundColor: cup.accent }}
                  className="absolute -left-[27px] top-1 size-3 rounded-full ring-4 ring-amber-50 dark:ring-slate-900"
                />
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  {formatDay(round.start)} {dayKey(round.start).slice(0, 4)}
                </p>
                <p className="font-semibold">
                  <Link href={`/coupes/${cup.slug}`} className="hover:underline">
                    {cup.name}
                  </Link>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {round.venue ?? "Stade à confirmer"} · {countdown(daysUntil(round.start, now))}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
