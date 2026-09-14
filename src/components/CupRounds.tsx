import type { CupRound } from "@/lib/types";

const STATE_STYLES = {
  done: {
    label: "Terminé",
    card: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400",
    tag: "text-slate-400",
  },
  current: {
    label: "Tour actuel",
    card: "border-[var(--accent)] bg-white shadow-sm ring-1 ring-[var(--accent)] dark:bg-slate-900",
    tag: "text-[var(--accent)]",
  },
  next: {
    label: "À venir",
    card: "border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900",
    tag: "text-slate-400",
  },
} as const;

// Frise des tours de la coupe : terminés, tour actuel, à venir.
export function CupRounds({ rounds }: { rounds: CupRound[] }) {
  if (rounds.length === 0) return null;

  const now = Date.now();
  const current = rounds.findIndex((round) => Date.parse(round.end) > now);

  return (
    <section aria-labelledby="cup-rounds-heading">
      <h2 id="cup-rounds-heading" className="mb-3 text-lg font-semibold">
        Parcours de la compétition
      </h2>
      <ol className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2">
        {rounds.map((round, index) => {
          const state = current === -1 || index < current ? "done" : index === current ? "current" : "next";
          const style = STATE_STYLES[state];
          return (
            <li
              key={`${round.label}-${round.start}`}
              aria-current={state === "current" ? "step" : undefined}
              className={`w-40 shrink-0 snap-start rounded-xl border px-3 py-2.5 ${style.card}`}
            >
              <p className={`text-[10px] font-bold uppercase tracking-wide ${style.tag}`}>{style.label}</p>
              <p className="mt-0.5 font-semibold leading-tight">{round.label}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{round.dates ?? "Dates à confirmer"}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
