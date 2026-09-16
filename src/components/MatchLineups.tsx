import { ArrowDown, ArrowUp } from "lucide-react";
import type { Lineup, LineupPlayer, MatchDetail } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { TeamLogo } from "./TeamLogo";

// Abréviations de postes d'ESPN, en français.
const POSITIONS: Record<string, string> = {
  G: "G",
  GK: "G",
  LB: "DG",
  RB: "DD",
  LWB: "PG",
  RWB: "PD",
  CB: "DC",
  CD: "DC",
  "CD-L": "DC",
  "CD-R": "DC",
  DM: "MDC",
  "DM-L": "MDC",
  "DM-R": "MDC",
  CM: "MC",
  "CM-L": "MC",
  "CM-R": "MC",
  AM: "MOC",
  "AM-L": "MOC",
  "AM-R": "MOC",
  LM: "MG",
  RM: "MD",
  LW: "AG",
  RW: "AD",
  F: "BU",
  CF: "BU",
  "CF-L": "BU",
  "CF-R": "BU",
  ST: "BU",
  SW: "LIB",
  CAM: "MOC",
  CDM: "MDC",
  LF: "AG",
  RF: "AD",
  SUB: "Rempl.",
};

function Card({ color, count }: { color: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span aria-hidden className={`inline-block h-3 w-2 rounded-[1px] ${color}`} />
      {count > 1 && <span className="text-[10px] tabular-nums">×{count}</span>}
    </span>
  );
}

function PlayerRow({ player }: { player: LineupPlayer }) {
  const position = player.position ? (POSITIONS[player.position] ?? player.position) : null;
  return (
    <li className="flex items-center gap-2 py-1.5 text-sm">
      <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-400">{player.jersey}</span>
      <span className={`min-w-0 flex-1 truncate ${player.starter || player.subbedIn !== null ? "" : "text-slate-500 dark:text-slate-400"}`}>
        {player.name}
      </span>
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        {player.goals > 0 && (
          <span title={`${player.goals} but${player.goals > 1 ? "s" : ""}`}>
            <span aria-hidden>⚽</span>
            {player.goals > 1 && <span className="tabular-nums">×{player.goals}</span>}
            <span className="sr-only">
              {player.goals} but{player.goals > 1 ? "s" : ""}
            </span>
          </span>
        )}
        {player.assists > 0 && (
          <span className="rounded bg-slate-100 px-1 text-[10px] font-semibold dark:bg-slate-800" title="Passe décisive">
            PD{player.assists > 1 ? `×${player.assists}` : ""}
            <span className="sr-only"> (passes décisives : {player.assists})</span>
          </span>
        )}
        {player.yellowCards > 0 && (
          <span title="Carton jaune">
            <Card color="bg-amber-400" count={player.yellowCards} />
            <span className="sr-only">Carton jaune</span>
          </span>
        )}
        {player.redCards > 0 && (
          <span title="Carton rouge">
            <Card color="bg-red-600" count={player.redCards} />
            <span className="sr-only">Carton rouge</span>
          </span>
        )}
        {player.subbedIn !== null && (
          <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400">
            <ArrowUp className="size-3.5" aria-hidden />
            <span className="sr-only">Entré à la </span>
            {player.subbedIn}
          </span>
        )}
        {player.subbedOut !== null && (
          <span className="inline-flex items-center text-red-500">
            <ArrowDown className="size-3.5" aria-hidden />
            <span className="sr-only">Sorti à la </span>
            {player.subbedOut}
          </span>
        )}
        {position && <span className="w-9 text-right text-[10px] font-semibold uppercase text-slate-400">{position}</span>}
      </span>
    </li>
  );
}

function TeamLineup({ lineup }: { lineup: Lineup }) {
  const starters = lineup.players.filter((player) => player.starter);
  const bench = lineup.players.filter((player) => !player.starter);

  return (
    <section aria-label={`Composition de ${lineup.team.name}`} className="min-w-0">
      <h3 className="flex items-center gap-2 font-semibold">
        <TeamLogo team={lineup.team} size={22} />
        <span className="min-w-0 flex-1 truncate">{lineup.team.name}</span>
        {lineup.formation && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums dark:bg-slate-800">
            {lineup.formation}
          </span>
        )}
      </h3>
      {lineup.players.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Composition pas encore publiée.</p>
      ) : (
        <>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Titulaires</p>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {starters.map((player) => (
              <PlayerRow key={player.id} player={player} />
            ))}
          </ul>
          {bench.length > 0 && (
            <>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Remplaçants</p>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {bench.map((player) => (
                  <PlayerRow key={player.id} player={player} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}

// Compositions des deux équipes fournies par ESPN : schéma, titulaires, remplaçants et faits de match.
export function MatchLineups({ detail }: { detail: MatchDetail }) {
  if (detail.lineups.every((lineup) => lineup.players.length === 0)) {
    return <EmptyState>Les compositions ne sont pas encore publiées.</EmptyState>;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {detail.lineups.map((lineup) => (
        <TeamLineup key={lineup.side} lineup={lineup} />
      ))}
    </div>
  );
}
