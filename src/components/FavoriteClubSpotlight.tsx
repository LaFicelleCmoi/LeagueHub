"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Star } from "lucide-react";
import { useFavoriteClub } from "@/lib/favorite-club";
import { formatTime, TIME_ZONE } from "@/lib/format";
import { getLeague } from "@/lib/leagues";
import type { Match, TeamFixture, TeamForm } from "@/lib/types";
import { OUTCOMES } from "./ClubDialog";
import { useOpenClub } from "./ClubDialogProvider";
import { EUROPEAN_CUP_STYLES, EuropeanCupTag } from "./EuropeanCup";
import { LeagueLogo } from "./LeagueLogo";
import { useLiveMatches } from "./LiveMatches";
import { TeamLogo } from "./TeamLogo";

export interface ClubPosition {
  rank: number;
  points: number;
  played: number;
  teams: number;
}

const fixtureDay = new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, weekday: "short", day: "numeric", month: "short" });
const ordinal = (rank: number) => (rank === 1 ? "1er" : `${rank}e`);
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function Tile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/80 p-3 ring-1 ring-slate-200/80 dark:bg-slate-900/60 dark:ring-slate-800">
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1.5">{children}</dd>
    </div>
  );
}

function Opponent({ home, opponent }: { home: boolean; opponent: TeamFixture["opponent"] }) {
  return (
    <p className="flex items-center gap-2 text-sm font-medium">
      <span className="text-xs font-normal text-slate-400">{home ? "vs" : "chez"}</span>
      <TeamLogo team={opponent} size={18} />
      <span className="truncate">{opponent.name}</span>
    </p>
  );
}

function TodayMatch({ match, teamId }: { match: Match; teamId: string }) {
  const home = match.home.team.id === teamId;
  const us = home ? match.home : match.away;
  const them = home ? match.away : match.home;

  return (
    <>
      <Opponent home={home} opponent={them.team} />
      <p className="mt-1 flex items-center gap-2">
        {match.state === "pre" ? (
          <span className="text-sm font-semibold">Coup d’envoi {match.status}</span>
        ) : (
          <>
            <span className="text-lg font-bold tabular-nums">
              {us.score ?? 0}–{them.score ?? 0}
            </span>
            {match.state === "in" ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-red-500 motion-reduce:animate-none" />
                <span className="sr-only">En direct,</span>
                {match.status}
              </span>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">{match.status}</span>
            )}
          </>
        )}
      </p>
    </>
  );
}

function Skeleton({ className }: { className: string }) {
  return <span aria-hidden className={`block animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-800 ${className}`} />;
}

// Section « Mon club » de l'accueil : n'apparaît que si le visiteur a choisi un club favori.
export function FavoriteClubSpotlight({ positions, matches }: { positions: Record<string, ClubPosition>; matches: Match[] }) {
  const favorite = useFavoriteClub();
  const openClub = useOpenClub();
  const liveMatches = useLiveMatches(matches);
  const [form, setForm] = useState<TeamForm | null>(null);

  const teamId = favorite?.team.id;
  const leagueSlug = favorite?.league;

  useEffect(() => {
    setForm(null);
    if (!teamId || !leagueSlug) return;
    const controller = new AbortController();
    fetch(`/api/teams/${leagueSlug}/${teamId}`, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<TeamForm>) : null))
      .then(setForm)
      .catch(() => {
        // Forme indisponible : le reste de la carte s'affiche quand même.
      });
    return () => controller.abort();
  }, [teamId, leagueSlug]);

  const league = favorite ? getLeague(favorite.league) : undefined;
  if (!favorite || !league) return null;

  const position = positions[favorite.team.id];
  const today = liveMatches.find(
    (match) => match.home.team.id === favorite.team.id || match.away.team.id === favorite.team.id,
  );

  return (
    <section
      aria-labelledby="my-club-heading"
      className="relative overflow-hidden rounded-2xl border border-amber-300/80 bg-gradient-to-br from-amber-50 via-white to-white p-5 shadow-sm dark:border-amber-500/30 dark:from-amber-500/15 dark:via-slate-900 dark:to-slate-900"
    >
      {/* Grand logo en filigrane. */}
      <div aria-hidden className="pointer-events-none absolute -bottom-12 -right-10 opacity-[0.07] dark:opacity-10">
        <TeamLogo team={favorite.team} size={220} />
      </div>

      <div className="relative flex flex-wrap items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white shadow-sm ring-2 ring-amber-300 dark:bg-slate-800 dark:ring-amber-500/50">
          <TeamLogo team={favorite.team} size={44} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            <Star className="size-3.5 fill-amber-400 text-amber-500" aria-hidden />
            Mon club
          </p>
          <h2 id="my-club-heading" className="truncate text-xl font-bold sm:text-2xl">
            {favorite.team.name}
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <LeagueLogo league={league} size={14} />
            {league.name}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openClub?.(favorite)}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Voir la fiche
        </button>
      </div>

      <dl className="relative mt-5 grid gap-3 sm:grid-cols-3">
        <Tile label="Classement">
          {position ? (
            <>
              <p>
                <span className="text-2xl font-bold">{ordinal(position.rank)}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400"> sur {position.teams}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {position.points} pts · {position.played} {position.played > 1 ? "matchs" : "match"}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">Indisponible</p>
          )}
        </Tile>

        <Tile label="Forme">
          {form ? (
            form.results.length > 0 ? (
              <ol className="flex gap-1" aria-label="Du plus récent au plus ancien">
                {form.results.map((result) => (
                  <li
                    key={result.id}
                    title={`${OUTCOMES[result.outcome].label} ${result.goalsFor}-${result.goalsAgainst} contre ${result.opponent.name}`}
                    className={`grid size-7 place-items-center rounded-md text-xs font-bold ${OUTCOMES[result.outcome].badge} ${
                      result.europeanCup ? EUROPEAN_CUP_STYLES[result.europeanCup].ring : ""
                    }`}
                  >
                    <span aria-hidden>{OUTCOMES[result.outcome].letter}</span>
                    <span className="sr-only">{OUTCOMES[result.outcome].label}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-500">Aucun match récent</p>
            )
          ) : (
            <span className="flex gap-1">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="size-7" />
              ))}
            </span>
          )}
        </Tile>

        <Tile label={today ? "Aujourd’hui" : "Prochain match"}>
          {today ? (
            <TodayMatch match={today} teamId={favorite.team.id} />
          ) : form?.next ? (
            <>
              <Opponent home={form.next.home} opponent={form.next.opponent} />
              <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="truncate">
                  {capitalize(fixtureDay.format(new Date(form.next.date)))} · {formatTime(form.next.date)}
                </span>
                {form.next.europeanCup ? (
                  <EuropeanCupTag cup={form.next.europeanCup} label={EUROPEAN_CUP_STYLES[form.next.europeanCup].short} />
                ) : (
                  <span className="truncate">· {form.next.competition}</span>
                )}
              </p>
            </>
          ) : form ? (
            <p className="text-sm text-slate-500">Aucun match programmé</p>
          ) : (
            <>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-1.5 h-3 w-24" />
            </>
          )}
        </Tile>
      </dl>
    </section>
  );
}
