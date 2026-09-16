"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, CircleDot, Flag, Hand, MonitorPlay, Timer, XCircle } from "lucide-react";
import type { MatchDetail, TimelineEvent, TimelineKind } from "@/lib/types";
import { EmptyState } from "./EmptyState";

const GOALS = new Set<TimelineKind>(["goal", "penalty-goal", "own-goal"]);

function CardShape({ className }: { className: string }) {
  return <span aria-hidden className={`inline-block h-3.5 w-2.5 rounded-[2px] ${className}`} />;
}

function EventIcon({ kind }: { kind: TimelineKind }) {
  switch (kind) {
    case "goal":
    case "penalty-goal":
      return <span aria-hidden className="text-base leading-none">⚽</span>;
    case "own-goal":
      return <span aria-hidden className="text-base leading-none opacity-60 grayscale">⚽</span>;
    case "penalty-missed":
      return <XCircle className="size-4 text-red-500" aria-hidden />;
    case "penalty-saved":
      return <Hand className="size-4 text-sky-500" aria-hidden />;
    case "yellow-card":
      return <CardShape className="bg-amber-400" />;
    case "second-yellow":
      return (
        <span aria-hidden className="relative inline-flex h-3.5 w-3.5">
          <CardShape className="absolute left-0 top-0 bg-amber-400" />
          <CardShape className="absolute left-1 top-0.5 bg-red-600" />
        </span>
      );
    case "red-card":
      return <CardShape className="bg-red-600" />;
    case "substitution":
      return (
        <span aria-hidden className="flex flex-col -space-y-1">
          <ArrowUp className="size-3.5 text-emerald-600" />
          <ArrowDown className="size-3.5 text-red-500" />
        </span>
      );
    case "var":
      return <MonitorPlay className="size-4 text-violet-500" aria-hidden />;
    case "delay":
      return <Timer className="size-4 text-slate-400" aria-hidden />;
    case "period":
      return <Flag className="size-3.5 text-slate-400" aria-hidden />;
    default:
      return <CircleDot className="size-4 text-slate-400" aria-hidden />;
  }
}

function EventBody({ event, align }: { event: TimelineEvent; align: "left" | "right" }) {
  const [main, second] = event.players;
  return (
    <div className={`flex items-start gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <span className="mt-0.5 grid w-4 shrink-0 place-items-center">
        <EventIcon kind={event.kind} />
      </span>
      <div className="min-w-0 text-sm">
        <p
          className={`text-[11px] font-semibold uppercase tracking-wide ${
            event.kind === "delay" ? "text-slate-400" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {event.label}
        </p>
        {event.kind === "substitution" ? (
          <>
            {main && <p className="text-emerald-700 dark:text-emerald-400">Entre : {main}</p>}
            {second && <p className="text-red-600 dark:text-red-400">Sort : {second}</p>}
          </>
        ) : (
          <>
            {main && <p className="font-medium text-slate-900 dark:text-white">{main}</p>}
            {second && GOALS.has(event.kind) && event.kind !== "own-goal" && (
              <p className="text-slate-600 dark:text-slate-300">Passe décisive : {second}</p>
            )}
          </>
        )}
        {event.detail && <p className="text-xs text-slate-500 dark:text-slate-400">{event.detail}</p>}
      </div>
    </div>
  );
}

// Chronologie complète du match fournie par ESPN : buts, cartons, remplacements, VAR, périodes…
export function MatchTimeline({ detail }: { detail: MatchDetail }) {
  const [showDelays, setShowDelays] = useState(false);
  const { match, timeline } = detail;
  const delays = timeline.filter((event) => event.kind === "delay").length;
  const events = timeline.filter((event) => showDelays || event.kind !== "delay");

  if (timeline.length === 0) {
    return (
      <EmptyState>
        {match.state === "pre"
          ? "La chronologie s’affichera dès le coup d’envoi."
          : "ESPN ne fournit pas de chronologie pour ce match."}
      </EmptyState>
    );
  }

  return (
    <div>
      {delays > 0 && (
        <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <input
            type="checkbox"
            checked={showDelays}
            onChange={(event) => setShowDelays(event.target.checked)}
            className="size-3.5 accent-slate-900 dark:accent-white"
          />
          Afficher les arrêts de jeu ({delays})
        </label>
      )}

      <ol className="space-y-1">
        {events.map((event) => {
          if (event.side === null) {
            return (
              <li
                key={event.id}
                className="flex items-center gap-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400"
              >
                <span aria-hidden className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                <EventIcon kind={event.kind} />
                <span className="text-center">
                  {event.minute && `${event.minute} · `}
                  {event.label}
                  {event.detail && event.kind !== "period" ? ` · ${event.detail}` : ""}
                </span>
                <span aria-hidden className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </li>
            );
          }

          const team = match[event.side].team;
          return (
            <li
              key={event.id}
              className={`grid grid-cols-[minmax(0,1fr)_2.75rem_minmax(0,1fr)] items-start gap-2 rounded-lg px-1 py-1.5 ${
                GOALS.has(event.kind) ? "bg-emerald-50/80 dark:bg-emerald-500/10" : ""
              }`}
            >
              <span className="sr-only">
                {team.name}, {event.minute} :
              </span>
              <div className="min-w-0">{event.side === "home" && <EventBody event={event} align="right" />}</div>
              <span
                aria-hidden
                className="mt-0.5 justify-self-center rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums dark:bg-slate-800"
              >
                {event.minute}
              </span>
              <div className="min-w-0">{event.side === "away" && <EventBody event={event} align="left" />}</div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
