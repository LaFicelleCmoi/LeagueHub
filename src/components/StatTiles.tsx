import CountUp from "./reactbits/CountUp";

export interface Stat {
  label: string;
  value: number;
  /** Précision affichée sous le libellé (ex. moyenne par match). */
  hint?: string | null;
  /** Mise en avant avec la couleur du championnat (bleu LeagueHub par défaut). */
  accent?: boolean;
  /** Classes de placement dans la grille (ex. col-span-2). */
  className?: string;
}

// Cases de chiffres clés : valeur animée, libellé et précision éventuelle.
export function StatTiles({ stats, className = "" }: { stats: Stat[]; className?: string }) {
  return (
    <dl className={`grid gap-3 ${className}`}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 ${
            stat.accent
              ? "before:absolute before:inset-y-3 before:left-0 before:w-1 before:rounded-r-full before:bg-[var(--accent,#13295b)] dark:before:bg-[var(--accent,#60a5fa)]"
              : ""
          } ${stat.className ?? ""}`}
        >
          {/* Ordre visuel : valeur, libellé, précision (l'ordre du code garde dt avant dd). */}
          <dt className="order-2 text-sm text-slate-500 dark:text-slate-400">{stat.label}</dt>
          <dd className="order-1 text-2xl font-bold tabular-nums">
            <CountUp to={stat.value} duration={1.2} separator={" "} />
          </dd>
          {stat.hint && <dd className="order-3 mt-0.5 text-xs text-slate-400 dark:text-slate-500">{stat.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}
