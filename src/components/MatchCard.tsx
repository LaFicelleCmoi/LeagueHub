import { MapPin } from "lucide-react";
import { groupByDay } from "@/lib/format";
import type { Match, MatchEvent, MatchEventKind, MatchSide } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { TeamLogo } from "./TeamLogo";

const EVENT_SUFFIX: Record<MatchEventKind, string> = {
  goal: "",
  penalty: " (pén.)",
  "own-goal": " (c.s.c.)",
  "red-card": "",
};

function LiveBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400">
      <span className="relative flex size-2" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-red-500" />
      </span>
      <span className="sr-only">En direct, </span>
      {label}
    </span>
  );
}

function TeamLine({ side, match }: { side: MatchSide; match: Match }) {
  const decided = match.home.winner || match.away.winner;
  const dimmed = match.state === "post" && decided && !side.winner;
  const tone = dimmed ? "text-slate-500 dark:text-slate-400" : "";

  return (
    <div className="flex items-center gap-3">
      <TeamLogo team={side.team} size={22} />
      <span className={`min-w-0 flex-1 truncate ${dimmed ? tone : "font-semibold"}`}>{side.team.name}</span>
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
          {event.kind === "red-card" ? (
            <>
              <span aria-hidden className="inline-block h-3 w-2 shrink-0 rounded-[1px] bg-red-600" />
              <span className="sr-only">Carton rouge :</span>
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

export function MatchCard({ match }: { match: Match }) {
  const home = match.events.filter((e) => e.side === "home");
  const away = match.events.filter((e) => e.side === "away");

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-4">
        <div className="w-16 shrink-0 text-center text-xs font-semibold">
          {match.state === "in" ? (
            <LiveBadge label={match.status} />
          ) : (
            <span className={match.state === "post" ? "text-slate-500 dark:text-slate-400" : ""}>{match.status}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <TeamLine side={match.home} match={match} />
          <TeamLine side={match.away} match={match} />
        </div>
      </div>

      {match.events.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-4 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
          <EventList events={home} />
          <EventList events={away} alignRight />
        </div>
      )}

      {match.venue && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{match.venue}</span>
        </p>
      )}
    </article>
  );
}

export function MatchDayList({ title, matches, empty }: { title: string; matches: Match[]; empty: string }) {
  const days = groupByDay(matches);

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {days.length === 0 ? (
        <EmptyState>{empty}</EmptyState>
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <div key={day.key}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {day.label}
              </h3>
              <div className="space-y-3">
                {day.items.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
