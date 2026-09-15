import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, CalendarClock, Trophy } from "lucide-react";
import { currentRound } from "@/lib/cup-calendar";
import type { Cup } from "@/lib/cups";
import { formatDateTime } from "@/lib/format";
import { plural } from "@/lib/league-stats";
import type { CupMatch, CupOverview } from "@/lib/types";
import { CupLogo } from "./CupLogo";
import { TeamLogo } from "./TeamLogo";

function MiniMatch({ item, label, showRound = true }: { item: CupMatch; label: string; showRound?: boolean }) {
  const { match } = item;
  const played = match.state !== "pre";
  const decided = match.home.winner || match.away.winner;

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
        {showRound && item.round ? ` · ${item.round}` : ""}
      </p>
      <div className="mt-1.5 space-y-1 text-sm">
        {[match.home, match.away].map((side) => (
          <p key={side.team.id} className="flex items-center gap-2">
            <TeamLogo team={side.team} size={18} />
            <span
              className={`min-w-0 flex-1 truncate ${played && decided && !side.winner ? "text-slate-500 dark:text-slate-400" : "font-medium"}`}
            >
              {side.team.name}
            </span>
            {played && side.score !== null && (
              <span className="font-bold tabular-nums">
                {side.shootout !== null && (
                  <span className="mr-1 text-xs font-normal text-slate-400">({side.shootout})</span>
                )}
                {side.score}
              </span>
            )}
          </p>
        ))}
      </div>
      {!played && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(match.date)}</p>}
    </div>
  );
}

// Carte d'une coupe sur la page « Coupes nationales ».
export function CupCard({ cup, overview }: { cup: Cup; overview: CupOverview | null }) {
  const now = Date.now();
  const focus = overview ? currentRound(overview.rounds, now) : null;
  const final = overview?.rounds.find((round) => round.key === "final" && Date.parse(round.end) > now);
  const next = overview?.upcoming[0];
  const last = overview?.results[0];

  return (
    <Link
      href={`/coupes/${cup.slug}`}
      style={{ "--accent": cup.accent } as CSSProperties}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="relative flex items-center gap-3 px-4 py-4">
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(120deg,color-mix(in_srgb,var(--accent)_16%,transparent),transparent_70%)]"
        />
        <div className="relative grid size-12 shrink-0 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          <CupLogo cup={cup} size={34} />
        </div>
        <div className="relative min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold leading-tight">{cup.name}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {cup.country}
            {overview?.season ? ` · ${overview.season}` : ""}
          </p>
        </div>
        <span aria-hidden className="relative h-8 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
      </div>

      <div className="flex flex-1 flex-col gap-4 border-t border-slate-100 px-4 py-4 dark:border-slate-800">
        {!overview ? (
          <p className="text-sm text-slate-500">Données momentanément indisponibles.</p>
        ) : (
          <>
            {(focus || overview.finished || overview.forecast) && (
              <div className="space-y-1">
                {focus ? (
                  <p className="text-sm">
                    <span className="text-slate-500 dark:text-slate-400">{focus.live ? "En cours" : "Prochain tour"} · </span>
                    <span className="font-semibold">{focus.round.label}</span>
                    {focus.round.dates && <span className="text-slate-500 dark:text-slate-400"> · {focus.round.dates}</span>}
                  </p>
                ) : overview.finished ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Édition {overview.season} terminée</p>
                ) : null}
                {overview.forecast && (
                  <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                    <CalendarClock className="size-3.5 shrink-0" aria-hidden />
                    Calendrier officiel, matchs pas encore publiés par ESPN
                  </p>
                )}
              </div>
            )}

            {next ? (
              <MiniMatch item={next} label="Prochain match" />
            ) : last ? (
              <MiniMatch item={last} label="Dernier résultat" />
            ) : overview.lastFinal ? (
              <MiniMatch item={overview.lastFinal} label="Dernière finale" showRound={false} />
            ) : (
              <p className="text-sm text-slate-500">Aucun match programmé pour le moment.</p>
            )}

            <div className="mt-auto space-y-1.5">
              {final && (
                <p className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <Trophy className="size-3.5 shrink-0 text-amber-500" aria-hidden />
                  <span className="truncate">
                    Finale {final.dates}
                    {final.venue ? ` · ${final.venue}` : ""}
                  </span>
                </p>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {overview.upcoming.length} {plural(overview.upcoming.length, "match à venir", "matchs à venir")} ·{" "}
                {overview.results.length} {plural(overview.results.length, "résultat récent", "résultats récents")}
              </p>
            </div>
          </>
        )}
      </div>

      <p className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm font-medium text-slate-600 transition-colors group-hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:group-hover:text-white">
        Voir la coupe
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </p>
    </Link>
  );
}
