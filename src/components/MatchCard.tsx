"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, MapPin, Star } from "lucide-react";
import { useFavoriteClub } from "@/lib/favorite-club";
import type { Match, MatchEvent, MatchEventKind, MatchSide } from "@/lib/types";
import { KickoffCountdown } from "./KickoffCountdown";
import { useLiveMatch } from "./LiveMatches";
import { MatchDetailDialog } from "./MatchDetailDialog";
import ShinyText from "./reactbits/ShinyText";
import StarBorder from "./reactbits/StarBorder";
import { TeamLogo } from "./TeamLogo";

const EVENT_SUFFIX: Record<MatchEventKind, string> = {
  goal: "",
  penalty: " (pén.)",
  "own-goal": " (c.s.c.)",
  "yellow-card": "",
  "red-card": "",
};

const GOAL_HIGHLIGHT_MS = 6000;

/** Vrai pendant quelques secondes quand le score d'une équipe augmente. */
function useGoalHighlight(score: number | null): boolean {
  const previous = useRef(score);
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    const scored = previous.current !== null && score !== null && score > previous.current;
    previous.current = score;
    if (!scored) {
      setHighlight(false);
      return;
    }
    setHighlight(true);
    const timeout = setTimeout(() => setHighlight(false), GOAL_HIGHLIGHT_MS);
    return () => clearTimeout(timeout);
  }, [score]);

  return highlight;
}

function LiveBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400">
      <span className="relative flex size-2" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75 motion-reduce:hidden" />
        <span className="relative inline-flex size-2 rounded-full bg-red-500" />
      </span>
      <span className="sr-only">En direct, {label}</span>
      <span aria-hidden>
        <ShinyText text={label} color="currentColor" shineColor="#fca5a5" speed={2.5} />
      </span>
    </span>
  );
}

function TeamLine({ side, match }: { side: MatchSide; match: Match }) {
  const scored = useGoalHighlight(side.score);
  const favorite = useFavoriteClub()?.team.id === side.team.id;
  const decided = match.home.winner || match.away.winner;
  const dimmed = match.state === "post" && decided && !side.winner;
  const tone = dimmed ? "text-slate-500 dark:text-slate-400" : "";

  return (
    <div
      className={`-mx-2 flex items-center gap-3 rounded-lg px-2 py-0.5 transition-colors duration-700 ${
        scored ? (favorite ? "bg-amber-400/25" : "bg-emerald-500/15") : ""
      }`}
    >
      <TeamLogo team={side.team} size={22} />
      <span className={`flex min-w-0 flex-1 items-center gap-1.5 ${dimmed ? tone : "font-semibold"}`}>
        <span className="truncate">{side.team.name}</span>
        {favorite && (
          <>
            <Star aria-hidden className="size-3.5 shrink-0 fill-amber-400 text-amber-500" />
            <span className="sr-only">(club favori)</span>
          </>
        )}
      </span>
      {scored && (
        // Le but du club favori a droit à sa célébration.
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-white ${
            favorite ? "animate-bounce bg-amber-500 motion-reduce:animate-none" : "bg-emerald-600"
          }`}
        >
          {favorite ? "But !" : "But"}
        </span>
      )}
      {side.shootout !== null && (
        <span className="text-xs tabular-nums text-slate-400" title="Tirs au but">
          <span className="sr-only">tirs au but : </span>({side.shootout})
        </span>
      )}
      {side.score !== null && (
        <span className={`w-6 text-right text-base tabular-nums ${dimmed ? tone : "font-bold"}`}>{side.score}</span>
      )}
    </div>
  );
}

function EventList({ events, alignRight = false }: { events: MatchEvent[]; alignRight?: boolean }) {
  return (
    <ul className="min-w-0 space-y-1">
      {events.map((event, index) => (
        <li
          key={`${event.minute}-${event.player}-${index}`}
          className={`flex items-center gap-1.5 ${alignRight ? "justify-end text-right" : ""}`}
        >
          {event.kind === "red-card" || event.kind === "yellow-card" ? (
            <>
              <span
                aria-hidden
                className={`inline-block h-3 w-2 shrink-0 rounded-[1px] ${event.kind === "red-card" ? "bg-red-600" : "bg-amber-400"}`}
              />
              <span className="sr-only">{event.kind === "red-card" ? "Carton rouge :" : "Carton jaune :"}</span>
            </>
          ) : (
            <>
              <span aria-hidden>⚽</span>
              <span className="sr-only">But :</span>
            </>
          )}
          <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">{event.minute}</span>
          <span className="truncate">
            {event.player}
            {EVENT_SUFFIX[event.kind]}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MatchCard({ match: initialMatch }: { match: Match }) {
  const match = useLiveMatch(initialMatch);
  const favorite = useFavoriteClub();
  const [detailOpen, setDetailOpen] = useState(false);
  const hasFavorite = favorite !== null && [match.home.team.id, match.away.team.id].includes(favorite.team.id);
  const live = match.state === "in";
  const home = match.events.filter((e) => e.side === "home");
  const away = match.events.filter((e) => e.side === "away");

  const card = (
    <article
      className={`min-w-0 rounded-xl border bg-white p-4 dark:bg-slate-900 ${
        hasFavorite
          ? "border-amber-300 ring-2 ring-amber-300/40 dark:border-amber-500/50 dark:ring-amber-500/20"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="w-16 shrink-0 text-center text-xs font-semibold">
          {live ? (
            <LiveBadge label={match.status} />
          ) : (
            <span className={match.state === "post" ? "text-slate-500 dark:text-slate-400" : ""}>{match.status}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <TeamLine side={match.home} match={match} />
          <TeamLine side={match.away} match={match} />
        </div>
      </div>

      {match.state === "pre" && <KickoffCountdown date={match.date} className="mt-3" />}

      {/* Annonce les changements de score aux lecteurs d'écran. */}
      {live && (
        <p className="sr-only" aria-live="polite">
          {`Score : ${match.home.team.name} ${match.home.score ?? 0}, ${match.away.team.name} ${match.away.score ?? 0}`}
        </p>
      )}

      {match.events.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-4 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
          <EventList events={home} />
          <EventList events={away} alignRight />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        {match.venue ? (
          <p className="flex min-w-0 items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{match.venue}</span>
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          className="-my-1 inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          Détails
          <span className="sr-only">
            {" "}
            du match {match.home.team.name} – {match.away.team.name}
          </span>
          <ChevronRight className="size-3.5" aria-hidden />
        </button>
      </div>

      {/* Fenêtre montée à la demande : chronologie, statistiques, compositions, infos et commentaire. */}
      {detailOpen && <MatchDetailDialog match={match} onClose={() => setDetailOpen(false)} />}
    </article>
  );

  if (!live) return card;

  // Bordure animée pour distinguer les matchs en cours.
  return (
    <StarBorder
      as="div"
      className="block min-w-0 rounded-xl"
      innerClassName="rounded-xl"
      color="#ef4444"
      speed="5s"
      thickness={2}
      backgroundColor="transparent"
      textColor="inherit"
      borderColor="transparent"
    >
      {card}
    </StarBorder>
  );
}
