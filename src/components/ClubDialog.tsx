"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronRight, Star, X } from "lucide-react";
import { setFavoriteClub, useFavoriteClub } from "@/lib/favorite-club";
import { TIME_ZONE } from "@/lib/format";
import { getLeague } from "@/lib/leagues";
import type { ClubRef, MatchOutcome, TeamForm } from "@/lib/types";
import { EUROPEAN_CUP_STYLES, EuropeanCupTag, EuropeanFixtureCard } from "./EuropeanCup";
import { KickoffCountdown } from "./KickoffCountdown";
import { LeagueLogo } from "./LeagueLogo";
import { TeamLogo } from "./TeamLogo";

export const OUTCOMES: Record<MatchOutcome, { letter: string; label: string; badge: string; score: string }> = {
  win: { letter: "V", label: "Victoire", badge: "bg-emerald-600 text-white", score: "text-emerald-700 dark:text-emerald-400" },
  draw: { letter: "N", label: "Match nul", badge: "bg-slate-400 text-white dark:bg-slate-500", score: "text-slate-600 dark:text-slate-300" },
  loss: { letter: "D", label: "Défaite", badge: "bg-red-600 text-white", score: "text-red-700 dark:text-red-400" },
};

const shortDate = new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, day: "numeric", month: "short" });
const fixtureDate = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

type Status = { state: "loading" } | { state: "error" } | { state: "ready"; form: TeamForm };

function summary({ results }: TeamForm): string {
  const count = (outcome: MatchOutcome) => results.filter((r) => r.outcome === outcome).length;
  const label = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
  return [
    label(count("win"), "victoire", "victoires"),
    label(count("draw"), "nul", "nuls"),
    label(count("loss"), "défaite", "défaites"),
  ].join(" · ");
}

// Fenêtre « 5 derniers matchs » d'un club, basée sur l'élément <dialog> natif
// (focus piégé, fermeture avec Échap, fond assombri).
export function ClubDialog({ club, onClose }: { club: ClubRef | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const favorite = useFavoriteClub();
  const [status, setStatus] = useState<Status>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (club && !dialog.open) dialog.showModal();
    if (!club && dialog.open) dialog.close();
  }, [club]);

  // La page derrière la fenêtre ne défile plus tant qu'elle est ouverte.
  useEffect(() => {
    if (!club) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [club]);

  useEffect(() => {
    if (!club) return;
    const controller = new AbortController();
    setStatus({ state: "loading" });
    fetch(`/api/teams/${club.league}/${club.team.id}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<TeamForm>;
      })
      .then((form) => setStatus({ state: "ready", form }))
      .catch(() => {
        if (!controller.signal.aborted) setStatus({ state: "error" });
      });
    return () => controller.abort();
  }, [club, attempt]);

  const close = () => dialogRef.current?.close();
  const league = club ? getLeague(club.league) : undefined;
  const isFavorite = Boolean(club && favorite?.team.id === club.team.id);
  const next = status.state === "ready" ? status.form.next : null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      aria-labelledby="club-dialog-title"
      className={`m-auto max-h-[min(90dvh,46rem)] w-[min(calc(100%-2rem),28rem)] overflow-y-auto rounded-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm dark:bg-slate-900 dark:text-slate-100 ${
        isFavorite ? "ring-2 ring-amber-400/70" : ""
      }`}
    >
      {club && league && (
        <div className="p-5">
          <header
            className={`flex items-start gap-3 ${
              isFavorite
                ? "-m-5 mb-0 rounded-t-2xl bg-gradient-to-br from-amber-100 via-amber-50 to-transparent p-5 dark:from-amber-500/25 dark:via-amber-500/5"
                : ""
            }`}
          >
            <TeamLogo team={club.team} size={48} />
            <div className="min-w-0 flex-1">
              {isFavorite && (
                <p className="mb-1 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-950">
                  <Star className="size-3 fill-amber-950" aria-hidden />
                  Votre club
                </p>
              )}
              <h2 id="club-dialog-title" className="text-lg font-bold leading-tight">
                {club.team.name}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <LeagueLogo league={league} size={14} />
                {league.name}
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Fermer"
              className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="size-5" aria-hidden />
            </button>
          </header>

          <section className="mt-5" aria-labelledby="club-form-title">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h3 id="club-form-title" className="text-sm font-semibold">
                5 derniers matchs
              </h3>
              {status.state === "ready" && status.form.results.length > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{summary(status.form)}</p>
              )}
            </div>

            {status.state === "loading" && (
              <ul className="mt-3 space-y-2" aria-busy="true" aria-label="Chargement des résultats">
                {Array.from({ length: 5 }, (_, index) => (
                  <li key={index} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                ))}
              </ul>
            )}

            {status.state === "error" && (
              <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                Résultats momentanément indisponibles.{" "}
                <button
                  type="button"
                  onClick={() => setAttempt((n) => n + 1)}
                  className="font-medium text-slate-900 underline dark:text-white"
                >
                  Réessayer
                </button>
              </p>
            )}

            {status.state === "ready" &&
              (status.form.results.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">Aucun match officiel récent.</p>
              ) : (
                <>
                  <ol className="mt-3 flex gap-1.5" aria-label="Forme, du plus récent au plus ancien">
                    {status.form.results.map((result) => (
                      <li
                        key={result.id}
                        title={`${OUTCOMES[result.outcome].label} · ${result.competition}`}
                        className={`grid size-7 place-items-center rounded-md text-xs font-bold ${OUTCOMES[result.outcome].badge} ${
                          result.europeanCup ? EUROPEAN_CUP_STYLES[result.europeanCup].ring : ""
                        }`}
                      >
                        <span aria-hidden>{OUTCOMES[result.outcome].letter}</span>
                        <span className="sr-only">{OUTCOMES[result.outcome].label}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                    Du plus récent au plus ancien · V victoire · N nul · D défaite
                    {status.form.results.some((result) => result.europeanCup) && " · cerclé : coupe d’Europe"}
                  </p>

                  <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                    {status.form.results.map((result) => {
                      const outcome = OUTCOMES[result.outcome];
                      const cup = result.europeanCup;
                      const context = [shortDate.format(new Date(result.date)), result.home ? "Domicile" : "Extérieur", result.competition, result.detail]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <li
                          key={result.id}
                          className={`relative flex items-center gap-3 py-2.5 ${
                            cup ? `-mx-2 rounded-lg px-2 ${EUROPEAN_CUP_STYLES[cup].row}` : ""
                          }`}
                        >
                          {cup && (
                            <span
                              aria-hidden
                              className={`absolute inset-y-2 left-0 w-1 rounded-r-full ${EUROPEAN_CUP_STYLES[cup].bar}`}
                            />
                          )}
                          <span className="sr-only">
                            {`${outcome.label} ${result.goalsFor} à ${result.goalsAgainst} ${result.home ? "contre" : "chez"} ${result.opponent.name}, ${context}.`}
                          </span>
                          <span
                            aria-hidden
                            className={`grid size-7 shrink-0 place-items-center rounded-md text-xs font-bold ${outcome.badge}`}
                          >
                            {outcome.letter}
                          </span>
                          <div aria-hidden className="min-w-0 flex-1">
                            <p className="flex items-center gap-2 text-sm font-medium">
                              <span className="text-xs font-normal text-slate-400">{result.home ? "vs" : "chez"}</span>
                              <TeamLogo team={result.opponent} size={18} />
                              <span className="truncate">{result.opponent.name}</span>
                            </p>
                            {cup ? (
                              <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                <EuropeanCupTag cup={cup} label={result.competition} />
                                <span className="truncate">
                                  {[shortDate.format(new Date(result.date)), result.home ? "Domicile" : "Extérieur", result.detail]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              </p>
                            ) : (
                              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{context}</p>
                            )}
                          </div>
                          <span aria-hidden className={`shrink-0 text-base font-bold tabular-nums ${outcome.score}`}>
                            {result.goalsFor}–{result.goalsAgainst}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ))}
          </section>

          {next && (
            <section className="mt-5" aria-labelledby="club-next-title">
              <h3 id="club-next-title" className="text-sm font-semibold">
                Prochain match
              </h3>
              {next.europeanCup ? (
                <EuropeanFixtureCard fixture={next} cup={next.europeanCup} />
              ) : (
                <div
                  className={`mt-2 flex items-center gap-3 rounded-xl border p-3 ${
                    isFavorite
                      ? "border-amber-300 bg-amber-50/70 dark:border-amber-500/40 dark:bg-amber-500/10"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <CalendarDays className="size-5 shrink-0 text-slate-400" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span className="text-xs font-normal text-slate-400">{next.home ? "vs" : "chez"}</span>
                      <TeamLogo team={next.opponent} size={18} />
                      <span className="truncate">{next.opponent.name}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {[capitalize(fixtureDate.format(new Date(next.date))), next.home ? "Domicile" : "Extérieur", next.competition]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <KickoffCountdown date={next.date} className="mt-2" />
                  </div>
                </div>
              )}
            </section>
          )}

          <footer className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFavoriteClub(isFavorite ? null : club)}
              aria-pressed={isFavorite}
              className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <Star className={`size-4 ${isFavorite ? "fill-amber-400 text-amber-500" : "text-slate-400"}`} aria-hidden />
              {isFavorite ? "Club favori" : "Mettre en favori"}
            </button>
            <Link
              href={`/${club.league}`}
              onClick={close}
              className="inline-flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Voir le classement
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </footer>
        </div>
      )}
    </dialog>
  );
}
