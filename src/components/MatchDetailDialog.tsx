"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart3, Info, ListOrdered, MessageSquareText, Users, X } from "lucide-react";
import type { Match, MatchDetail } from "@/lib/types";
import { MatchCommentary } from "./MatchCommentary";
import { MatchInfo } from "./MatchInfo";
import { MatchLineups } from "./MatchLineups";
import { MatchStats } from "./MatchStats";
import { MatchTimeline } from "./MatchTimeline";
import { TeamLogo } from "./TeamLogo";

type Status = { state: "loading" } | { state: "error" } | { state: "ready"; detail: MatchDetail };

/** Pendant le match, et juste avant, le détail est relu régulièrement. */
const LIVE_REFRESH = 30_000;
const BEFORE_KICKOFF = 15 * 60_000;

const TABS = [
  { id: "timeline", label: "Chronologie", icon: ListOrdered },
  { id: "stats", label: "Statistiques", icon: BarChart3 },
  { id: "lineups", label: "Compositions", icon: Users },
  { id: "info", label: "Infos", icon: Info },
  { id: "commentary", label: "Commentaire", icon: MessageSquareText },
] as const;

type TabId = (typeof TABS)[number]["id"];

function followsLive(match: Match, now: number): boolean {
  return match.state === "in" || (match.state === "pre" && Date.parse(match.date) - now <= BEFORE_KICKOFF);
}

function useMatchDetail(competition: string, id: string, attempt: number): Status {
  const [status, setStatus] = useState<Status>({ state: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let loaded = false;

    const load = async () => {
      if (loaded && document.visibilityState !== "visible") {
        timer = setTimeout(load, LIVE_REFRESH);
        return;
      }
      try {
        const response = await fetch(`/api/matches/${competition}/${id}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const detail = (await response.json()) as MatchDetail;
        loaded = true;
        setStatus({ state: "ready", detail });
        if (followsLive(detail.match, Date.now())) timer = setTimeout(load, LIVE_REFRESH);
      } catch {
        if (controller.signal.aborted) return;
        // Un détail déjà affiché reste visible : on retente simplement plus tard.
        if (loaded) timer = setTimeout(load, LIVE_REFRESH);
        else setStatus({ state: "error" });
      }
    };

    setStatus({ state: "loading" });
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [competition, id, attempt]);

  return status;
}

function Side({ match, side }: { match: Match; side: "home" | "away" }) {
  const team = match[side].team;
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      <TeamLogo team={team} size={40} />
      <span className="line-clamp-2 text-sm font-semibold leading-tight">{team.name}</span>
    </div>
  );
}

// Fenêtre « Détails du match » : tout ce qu'ESPN fournit sur le match, en français.
export function MatchDetailDialog({ match: cardMatch, onClose }: { match: Match; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<TabId>("timeline");
  const [attempt, setAttempt] = useState(0);
  const status = useMatchDetail(cardMatch.competition, cardMatch.id, attempt);
  const detail = status.state === "ready" ? status.detail : null;
  // La carte suit le direct toutes les 20 s ; sans données ESPN, le détail prend le relais.
  const match = detail && cardMatch.home.score === null ? detail.match : cardMatch;
  const live = match.state === "in";
  const titleId = `match-${cardMatch.id}-title`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      aria-labelledby={titleId}
      className="m-auto max-h-[min(92dvh,52rem)] w-[min(calc(100%-1rem),44rem)] overflow-y-auto rounded-2xl bg-white p-0 text-left text-slate-900 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm dark:bg-slate-900 dark:text-slate-100"
    >
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 pt-4 backdrop-blur sm:px-5 dark:border-slate-800 dark:bg-slate-900/95">
        <h2 id={titleId} className="sr-only">
          Détails du match {match.home.team.name} – {match.away.team.name}
        </h2>
        <button
          type="button"
          onClick={close}
          aria-label="Fermer"
          className="absolute right-2 top-2 grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <X className="size-5" aria-hidden />
        </button>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-6">
          <Side match={match} side="home" />
          <div className="flex flex-col items-center gap-1">
            {match.state === "pre" ? (
              <span className="text-2xl font-bold tabular-nums">{match.status}</span>
            ) : (
              <span className="text-3xl font-bold tabular-nums">
                {match.home.score ?? "–"}
                <span className="mx-1.5 text-slate-300 dark:text-slate-600">–</span>
                {match.away.score ?? "–"}
              </span>
            )}
            {match.home.shootout !== null && match.away.shootout !== null && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                t.a.b. {match.home.shootout}–{match.away.shootout}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                live ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {live && (
                <span className="relative flex size-2" aria-hidden>
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75 motion-reduce:hidden" />
                  <span className="relative inline-flex size-2 rounded-full bg-red-500" />
                </span>
              )}
              {live && <span className="sr-only">En direct,</span>}
              {match.state === "pre" ? "Coup d’envoi" : match.status}
            </span>
          </div>
          <Side match={match} side="away" />
        </div>

        <div role="tablist" aria-label="Sections du détail du match" className="-mx-4 mt-3 flex overflow-x-auto px-2 sm:-mx-5 sm:px-3">
          {TABS.map(({ id, label, icon: Icon }) => {
            const selected = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`${titleId}-${id}`}
                aria-selected={selected}
                aria-controls={`${titleId}-panel`}
                onClick={() => setTab(id)}
                className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  selected
                    ? "border-slate-900 text-slate-900 dark:border-white dark:text-white"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel" id={`${titleId}-panel`} aria-labelledby={`${titleId}-${tab}`} className="px-4 py-4 sm:px-5">
        {status.state === "loading" && (
          <div className="space-y-2" aria-busy="true" aria-label="Chargement du détail du match">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        )}

        {status.state === "error" && (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            Détail du match momentanément indisponible.{" "}
            <button
              type="button"
              onClick={() => setAttempt((count) => count + 1)}
              className="font-medium text-slate-900 underline dark:text-white"
            >
              Réessayer
            </button>
          </p>
        )}

        {detail && tab === "timeline" && <MatchTimeline detail={detail} />}
        {detail && tab === "stats" && <MatchStats detail={detail} />}
        {detail && tab === "lineups" && <MatchLineups detail={detail} />}
        {detail && tab === "info" && <MatchInfo detail={detail} />}
        {detail && tab === "commentary" && <MatchCommentary detail={detail} />}
      </div>
    </dialog>
  );
}
