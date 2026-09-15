import type { TeamLiveMatch } from "@/lib/types";
import { EUROPEAN_CUP_STYLES, EuropeanCupTag } from "./EuropeanCup";
import { TeamLogo } from "./TeamLogo";

function LiveDot() {
  return (
    <span className="relative flex size-2 shrink-0" aria-hidden>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75 motion-reduce:hidden" />
      <span className="relative inline-flex size-2 rounded-full bg-red-500" />
    </span>
  );
}

function Opponent({ match }: { match: TeamLiveMatch }) {
  return (
    <p className="flex items-center gap-2 text-sm font-medium">
      <span className="text-xs font-normal text-slate-400">{match.home ? "vs" : "chez"}</span>
      <TeamLogo team={match.opponent} size={18} />
      <span className="truncate">{match.opponent.name}</span>
    </p>
  );
}

/** Match du club en cours, avec son score : fiche du club, ou version compacte pour « Mon club ». */
export function TeamLiveMatchCard({ match, compact = false }: { match: TeamLiveMatch; compact?: boolean }) {
  const score = `${match.goalsFor}–${match.goalsAgainst}`;
  // Annoncé aux lecteurs d'écran à chaque changement de score ou de minute.
  const spoken = `En direct, ${match.clock} : ${match.goalsFor} à ${match.goalsAgainst} ${match.home ? "contre" : "chez"} ${match.opponent.name}, ${match.competition}.`;

  if (compact) {
    return (
      <>
        <div aria-hidden>
          <Opponent match={match} />
          <p className="mt-1 flex items-center gap-2">
            <span className="text-lg font-bold tabular-nums">{score}</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
              <LiveDot />
              {match.clock}
            </span>
          </p>
        </div>
        <p className="sr-only" aria-live="polite">
          {spoken}
        </p>
      </>
    );
  }

  return (
    <section aria-labelledby="club-live-title" className="mt-5">
      <h3 id="club-live-title" className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
        <LiveDot />
        En direct
      </h3>
      <div className="mt-2 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/70 p-3 dark:border-red-500/30 dark:bg-red-500/10">
        <div aria-hidden className="min-w-0 flex-1">
          <Opponent match={match} />
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            {match.europeanCup ? (
              <EuropeanCupTag cup={match.europeanCup} label={EUROPEAN_CUP_STYLES[match.europeanCup].short} />
            ) : (
              <span className="truncate">{match.competition}</span>
            )}
            <span className="shrink-0 font-semibold text-red-600 dark:text-red-400">· {match.clock}</span>
          </p>
        </div>
        <span aria-hidden className="shrink-0 text-2xl font-bold tabular-nums">
          {score}
        </span>
        <p className="sr-only" aria-live="polite">
          {spoken}
        </p>
      </div>
    </section>
  );
}
