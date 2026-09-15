import { CalendarClock } from "lucide-react";
import { roundStates, type RoundState } from "@/lib/cup-calendar";
import { plural } from "@/lib/league-stats";
import type { CupRound } from "@/lib/types";

const FOCUS_CARD = "border-[var(--accent)] bg-white shadow-sm ring-1 ring-[var(--accent)] dark:bg-slate-900";

const STATE_STYLES: Record<RoundState, { label: string; card: string; tag: string }> = {
  done: {
    label: "Terminé",
    card: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400",
    tag: "text-slate-400",
  },
  live: { label: "En cours", card: FOCUS_CARD, tag: "text-[var(--accent)]" },
  next: { label: "Prochain tour", card: FOCUS_CARD, tag: "text-[var(--accent)]" },
  later: {
    label: "À venir",
    card: "border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900",
    tag: "text-slate-400",
  },
};

/** Stade de la finale, sinon nombre de matchs et format du tour. */
function details(round: CupRound): string | null {
  if (round.venue) return round.venue;
  const parts = [
    round.fixtures !== null ? `${round.fixtures} ${plural(round.fixtures, "match", "matchs")}` : null,
    round.twoLegged ? "aller-retour" : null,
  ];
  return parts.filter(Boolean).join(" · ") || null;
}

// Frise des tours de la coupe : terminés, en cours ou prochain tour, à venir.
export function CupRounds({ rounds }: { rounds: CupRound[] }) {
  if (rounds.length === 0) return null;

  const states = roundStates(rounds, Date.now());

  return (
    <section aria-labelledby="cup-rounds-heading">
      <h2 id="cup-rounds-heading" className="mb-3 text-lg font-semibold">
        Parcours de la compétition
      </h2>
      {/* `relative` : les textes sr-only (en position absolue) restent dans la zone qui défile. */}
      <ol className="relative -mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-2">
        {rounds.map((round, index) => {
          const state = states[index];
          const style = STATE_STYLES[state];
          const info = details(round);
          return (
            <li
              key={`${round.key}-${round.start}`}
              aria-current={state === "live" || state === "next" ? "step" : undefined}
              className={`flex w-44 shrink-0 snap-start flex-col rounded-xl border px-3 py-2.5 ${style.card}`}
            >
              <p className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wide">
                <span className={style.tag}>{style.label}</span>
                {round.forecast && state !== "done" && (
                  <span
                    title="Date du calendrier officiel : ESPN n’a pas encore publié les matchs"
                    className="inline-flex items-center gap-0.5 font-medium normal-case tracking-normal text-slate-400"
                  >
                    <CalendarClock className="size-3" aria-hidden />
                    Prévu<span className="sr-only"> au calendrier officiel</span>
                  </span>
                )}
              </p>
              <p className="mt-0.5 font-semibold leading-tight">{round.label}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{round.dates ?? "Dates à confirmer"}</p>
              {info && (
                <p title={info} className="mt-auto truncate pt-1 text-[11px] text-slate-400">
                  {info}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
