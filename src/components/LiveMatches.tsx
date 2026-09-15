"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CupSlug } from "@/lib/cups";
import { TIME_ZONE } from "@/lib/format";
import type { LeagueSlug } from "@/lib/leagues";
import { LIVE_POLL_INTERVAL, needsLiveUpdate, type TrackedMatch } from "@/lib/live";
import type { Match } from "@/lib/types";

// Actualisation des scores sans recharger la page : le navigateur interroge la
// route interne /api/live/[championnat ou coupe], mise en cache quelques secondes. Jamais ESPN.

const MAX_RETRY_DELAY = 5 * 60_000;

export interface LiveSource {
  /** Championnat ou coupe nationale. */
  slug: LeagueSlug | CupSlug;
  matches: TrackedMatch[];
}

interface LiveState {
  matches: ReadonlyMap<string, Match>;
  status: "idle" | "live" | "error";
  lastUpdate: number | null;
}

const INITIAL_STATE: LiveState = { matches: new Map(), status: "idle", lastUpdate: null };

const LiveContext = createContext<LiveState>(INITIAL_STATE);

async function fetchLiveMatches(slug: LiveSource["slug"], signal: AbortSignal): Promise<Match[]> {
  const response = await fetch(`/api/live/${slug}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = (await response.json()) as { matches: Match[] };
  return data.matches;
}

export function LiveMatchesProvider({ sources, children }: { sources: LiveSource[]; children: ReactNode }) {
  const [state, setState] = useState<LiveState>(INITIAL_STATE);

  useEffect(() => {
    if (sources.length === 0) return;

    const controller = new AbortController();
    let known = new Map<string, Match>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight = false;
    let failures = 0;

    // Seuls les championnats et coupes ayant un match en cours ou imminent sont interrogés.
    const leaguesToRefresh = () => {
      const now = Date.now();
      return sources
        .filter((source) => source.matches.some((match) => needsLiveUpdate(known.get(match.id) ?? match, now)))
        .map((source) => source.slug);
    };

    const refresh = async () => {
      if (inFlight || controller.signal.aborted) return;
      clearTimeout(timer);

      const leagues = leaguesToRefresh();
      if (leagues.length === 0) {
        setState((current) => (current.status === "idle" ? current : { ...current, status: "idle" }));
      } else if (document.visibilityState === "visible") {
        inFlight = true;
        try {
          const results = await Promise.all(leagues.map((league) => fetchLiveMatches(league, controller.signal)));
          known = new Map(known);
          for (const match of results.flat()) known.set(match.id, match);
          failures = 0;
          setState({ matches: known, status: "live", lastUpdate: Date.now() });
        } catch {
          if (controller.signal.aborted) return;
          failures += 1;
          setState((current) => ({ ...current, status: "error" }));
        } finally {
          inFlight = false;
        }
      }

      // Après un échec, les tentatives s'espacent (40 s, 80 s… jusqu'à 5 min).
      const delay = failures === 0 ? LIVE_POLL_INTERVAL : Math.min(LIVE_POLL_INTERVAL * 2 ** failures, MAX_RETRY_DELAY);
      timer = setTimeout(refresh, delay);
    };

    // Onglet de nouveau visible : on rattrape immédiatement le retard.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    void refresh();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      controller.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [sources]);

  return <LiveContext.Provider value={state}>{children}</LiveContext.Provider>;
}

/** Version la plus récente d'un match : celle reçue en direct si elle existe. */
export function useLiveMatch(match: Match): Match {
  return useContext(LiveContext).matches.get(match.id) ?? match;
}

/** Liste de matchs dont chacun est remplacé par sa version reçue en direct quand elle existe. */
export function useLiveMatches(initial: Match[]): Match[] {
  const { matches } = useContext(LiveContext);
  return useMemo(() => initial.map((match) => matches.get(match.id) ?? match), [initial, matches]);
}

const clockFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function LiveIndicator() {
  const { status, lastUpdate } = useContext(LiveContext);

  if (status === "idle") return null;

  if (status === "error") {
    return (
      <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
        Scores momentanément indisponibles, nouvelle tentative en cours…
      </p>
    );
  }

  return (
    <p className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
      <span className="relative flex size-2" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75 motion-reduce:hidden" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      Scores en direct
      {lastUpdate !== null && ` · actualisés à ${clockFormatter.format(lastUpdate)}`}
    </p>
  );
}
