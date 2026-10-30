"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Ambulance,
  ArrowLeftRight,
  Dices,
  FastForward,
  Link2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Shuffle,
  Trash2,
  X,
} from "lucide-react";
import type { ClubIndexEntry } from "@/lib/clubs";
import { useFavoriteClub } from "@/lib/favorite-club";
import { getLeague } from "@/lib/leagues";
import {
  clockAt,
  createRng,
  defaultSettings,
  formatSimMinute,
  newSeed,
  PERIOD_LENGTH,
  randomCount,
  randomSettings,
  sanitizeSettings,
  SIDES,
  SIM_LIMITS,
  simulateMatch,
  statsFloor,
  type Intensity,
  type Side,
  type SimCount,
  type SimEvent,
  type SimMatch,
  type SimPlayer,
  type SimSettings,
  type SimTeamStats,
} from "@/lib/match-sim";
import type { SquadLine, SquadPlayer } from "@/lib/types";
import { ClubSearch } from "./ClubSearch";
import { LeagueLogo } from "./LeagueLogo";
import { TeamLogo } from "./TeamLogo";

// Simulateur de match : choix de l'affiche, réglages (score, penaltys, VAR, buteurs, cartons,
// blessures, possession, match à élimination directe) ou tirage au hasard, puis le match se
// déroule minute par minute avec les vrais joueurs, jusqu'aux tirs au but s'il le faut.

type Mode = "manual" | "random";
type Phase = "play" | "interval" | "shootout" | "done";

interface Run {
  settings: SimSettings;
  seed: number;
  mode: Mode;
  intensity: { goals: Intensity; cards: Intensity };
}

const GOAL_LEVELS = ["Fermé", "Équilibré", "Ouvert"] as const;
const CARD_LEVELS = ["Coulant", "Normal", "Sévère"] as const;
const SPEEDS = [1, 2, 4] as const;
// Minutes de jeu par seconde réelle à la vitesse ×1 : une mi-temps dure environ 22 secondes.
const MINUTES_PER_SECOND = 2;
const INTERVAL_MS = 1800;
const KICK_MS = 1100;
const INTERVAL_LABELS = ["Mi-temps", "Fin du temps réglementaire", "Mi-temps de la prolongation"];
const LINE_LABELS: Record<SquadLine, string> = { F: "Attaquants", M: "Milieux", D: "Défenseurs", G: "Gardiens" };

const card = "rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900";
const sideLabel = (side: Side) => (side === "home" ? "domicile" : "extérieur");

// --- Lien partageable : /simulateur?dom=bundesliga.132&ext=ligue-2.165&r=<réglages>&graine=42 ---

const clubKey = (club: ClubIndexEntry) => `${club.league}.${club.id}`;

function encodeSettings(settings: SimSettings): string {
  return btoa(JSON.stringify(settings)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeSettings(value: string | null): SimSettings | null {
  if (!value || value.length > 4000) return null;
  try {
    return sanitizeSettings(JSON.parse(atob(value.replace(/-/g, "+").replace(/_/g, "/"))));
  } catch {
    return null;
  }
}

/** Anciens liens (buts=2-1&jaunes=…&rouges=…) : encore lisibles. */
function legacySettings(params: URLSearchParams): SimSettings | null {
  const pair = (name: string) => params.get(name)?.match(/^(\d{1,2})-(\d{1,2})$/);
  const goals = pair("buts");
  if (!goals) return null;
  const row = (match: RegExpMatchArray | null | undefined) => ({ home: Number(match?.[1] ?? 0), away: Number(match?.[2] ?? 0) });
  return sanitizeSettings({ goals: row(goals), yellows: row(pair("jaunes")), reds: row(pair("rouges")) });
}

/** Buts de l'équipe, prolongation comprise quand elle aura lieu. */
function maxGoals(settings: SimSettings, side: Side): number {
  const extraTime = settings.knockout && settings.goals.home === settings.goals.away;
  return settings.goals[side] + (extraTime ? settings.extraGoals[side] : 0);
}

/** Garde les réglages cohérents : pas plus de penaltys ni de buteurs imposés que de buts. */
function normalize(settings: SimSettings): SimSettings {
  const next = { ...settings, penalties: { ...settings.penalties }, scorers: { ...settings.scorers } };
  for (const side of SIDES) {
    const total = maxGoals(next, side);
    next.penalties[side] = Math.min(next.penalties[side], total);
    let left = total;
    next.scorers[side] = next.scorers[side].flatMap((scorer) => {
      const goals = Math.min(scorer.goals, left);
      left -= goals;
      return goals > 0 ? [{ ...scorer, goals }] : [];
    });
  }
  return next;
}

// --- Petits éléments ---

function CardIcon({ color, className = "" }: { color: "yellow" | "red"; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-3.5 w-2.5 shrink-0 rounded-[2px] shadow-sm ${color === "yellow" ? "bg-yellow-400" : "bg-red-600"} ${className}`}
    />
  );
}

/** Petit ballon (le dessin du fond du site) : un emoji ⚽ manque sur certains appareils. */
function BallIcon({ className = "size-4" }: { className?: string }) {
  return (
    <span aria-hidden className={`inline-grid shrink-0 place-items-center rounded-full bg-slate-900 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- icône décorative de quelques pixels */}
      <img src="/ballon.svg" alt="" className="size-full" />
    </span>
  );
}

function VarIcon() {
  return (
    <span aria-hidden className="rounded bg-slate-800 px-1 text-[9px] font-black leading-4 tracking-wider text-white dark:bg-slate-200 dark:text-slate-900">
      VAR
    </span>
  );
}

function EventIcon({ event }: { event: SimEvent }) {
  switch (event.kind) {
    case "goal":
      return <BallIcon />;
    case "penaltyMiss":
      return (
        <span aria-hidden className="relative inline-grid">
          <BallIcon />
          <X className="absolute -right-1.5 -top-1.5 size-3 text-red-500" strokeWidth={3} />
        </span>
      );
    case "varGoal":
      return <VarIcon />;
    case "yellow":
      return <CardIcon color="yellow" />;
    case "sub":
      return <ArrowLeftRight className="size-4 text-emerald-500" aria-hidden />;
    case "injury":
      return <Ambulance className="size-4 text-rose-500" aria-hidden />;
    case "red":
      return event.secondYellow ? (
        <span aria-hidden className="relative inline-flex w-4">
          <CardIcon color="yellow" />
          <CardIcon color="red" className="absolute left-1.5 top-0.5" />
        </span>
      ) : (
        <CardIcon color="red" />
      );
  }
}

function playerLabel(player: SimPlayer): string {
  return player.jersey ? `${player.name} (n°${player.jersey})` : player.name;
}

function eventText(event: SimEvent): { title: string; detail: string | null } {
  switch (event.kind) {
    case "goal":
      return {
        title: event.ownGoal ? `But contre son camp de ${event.scorer.name}` : `But ! ${event.scorer.name}${event.penalty ? " sur penalty" : ""}`,
        detail: event.assist ? `Passe décisive : ${event.assist.name}` : null,
      };
    case "penaltyMiss":
      return {
        title: `Penalty manqué par ${event.player.name}`,
        detail: event.saved ? `Arrêté par ${event.keeper?.name ?? "le gardien"}` : "À côté du but",
      };
    case "varGoal":
      return { title: `But de ${event.player.name} refusé par la VAR`, detail: `Motif : ${event.reason}` };
    case "yellow":
      return { title: `Carton jaune : ${playerLabel(event.player)}`, detail: null };
    case "red":
      return { title: `${event.secondYellow ? "Second jaune, expulsion" : "Carton rouge"} : ${playerLabel(event.player)}`, detail: null };
    case "sub":
      return { title: `Remplacement : ${event.on.name}`, detail: `Remplace ${event.off.name}` };
    case "injury":
      return {
        title: `Blessure : ${event.player.name}`,
        detail: event.replacement ? `Remplacé par ${event.replacement.name}` : "Plus de remplaçant : l'équipe finit à dix",
      };
  }
}

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
            option.value === value
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-3 text-sm font-semibold"
    >
      <span className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"}`}>
        <span className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
      </span>
      {label}
    </button>
  );
}

function Stepper({ value, max, label, onChange }: { value: number; max: number; label: string; onChange: (value: number) => void }) {
  const button =
    "grid size-7 place-items-center rounded-lg border border-slate-200 text-slate-600 sm:size-8 transition hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800";
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <button type="button" className={button} onClick={() => onChange(value - 1)} disabled={value <= 0} aria-label={`${label} : un de moins`}>
        <Minus className="size-4" aria-hidden />
      </button>
      <output aria-label={label} className="w-5 text-center font-display text-2xl font-bold tabular-nums sm:w-6">
        {value}
      </output>
      <button type="button" className={button} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`${label} : un de plus`}>
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function DiceButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} au hasard`}
      title="Tirer au hasard"
      className="grid size-7 place-items-center rounded-lg text-slate-500 sm:size-8 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
    >
      <Dices className="size-4" aria-hidden />
    </button>
  );
}

interface CountRow {
  stat: SimCount;
  label: string;
  icon?: ReactNode;
  /** Plafond propre à une équipe (penaltys ≤ buts…). */
  max?: (side: Side) => number;
}

/** Tableau de réglages chiffrés : une ligne par réglage, une colonne par équipe. */
function CountTable({
  rows,
  settings,
  teams,
  onChange,
  onRoll,
}: {
  rows: CountRow[];
  settings: SimSettings;
  teams: Record<Side, ClubIndexEntry | null>;
  onChange: (stat: SimCount, side: Side, value: number) => void;
  onRoll: (stat: SimCount) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-2 gap-y-3 sm:gap-x-6">
      <span />
      {SIDES.map((side) => (
        <span key={side} className="truncate text-center text-xs font-bold uppercase tracking-wide text-slate-400">
          {teams[side]?.shortName ?? (side === "home" ? "Domicile" : "Extérieur")}
        </span>
      ))}
      <span />
      {rows.map(({ stat, label, icon, max }) => (
        <div key={stat} className="contents">
          <span className="flex min-w-0 items-center gap-2 text-sm font-semibold leading-tight">
            {/* Icônes masquées sur mobile : la place manque à côté des compteurs. */}
            {icon && <span className="contents max-sm:hidden">{icon}</span>}
            <span className="min-w-0 hyphens-auto">{label}</span>
          </span>
          {SIDES.map((side) => (
            <Stepper
              key={side}
              value={settings[stat][side]}
              max={Math.min(SIM_LIMITS[stat], max ? max(side) : SIM_LIMITS[stat])}
              label={`${label}, ${sideLabel(side)}`}
              onChange={(value) => onChange(stat, side, value)}
            />
          ))}
          <DiceButton label={label} onClick={() => onRoll(stat)} />
        </div>
      ))}
    </div>
  );
}

/** Buteurs imposés d'une équipe : joueurs de l'effectif et nombre de buts de chacun. */
function ScorerPicker({
  club,
  squad,
  scorers,
  goals,
  onChange,
}: {
  club: ClubIndexEntry | null;
  squad: SquadPlayer[] | null;
  scorers: SimSettings["scorers"][Side];
  goals: number;
  onChange: (scorers: SimSettings["scorers"][Side]) => void;
}) {
  const used = scorers.reduce((sum, scorer) => sum + scorer.goals, 0);
  const left = goals - used;
  const byId = new Map((squad ?? []).map((player) => [player.id, player]));
  const available = (squad ?? []).filter((player) => player.line !== "G" && !scorers.some((scorer) => scorer.id === player.id));

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-sm font-semibold">
        {club && <TeamLogo team={club} size={18} />}
        <span className="truncate">{club?.shortName ?? "Équipe"}</span>
        <span className="ml-auto shrink-0 text-xs font-normal text-slate-500 dark:text-slate-400">
          {goals === 0 ? "aucun but" : `${used} / ${goals} but${goals > 1 ? "s" : ""}`}
        </span>
      </p>
      <ul className="space-y-1.5">
        {scorers.map((scorer) => (
          <li key={scorer.id} className="flex items-center gap-2 rounded-lg bg-slate-50 py-1 pl-3 pr-1 dark:bg-slate-800/60">
            <BallIcon className="size-3.5" />
            <span className="min-w-0 flex-1 truncate text-sm">{byId.get(scorer.id)?.name ?? "Joueur"}</span>
            <Stepper
              value={scorer.goals}
              max={scorer.goals + left}
              label={`Buts de ${byId.get(scorer.id)?.name ?? "ce joueur"}`}
              onChange={(value) =>
                onChange(value <= 0 ? scorers.filter((item) => item.id !== scorer.id) : scorers.map((item) => (item.id === scorer.id ? { ...item, goals: value } : item)))
              }
            />
            <button
              type="button"
              onClick={() => onChange(scorers.filter((item) => item.id !== scorer.id))}
              aria-label="Retirer ce buteur"
              className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {!club ? null : squad === null ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">Chargement de l&apos;effectif…</p>
      ) : squad.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">Effectif indisponible pour ce club.</p>
      ) : (
        <select
          value=""
          disabled={left <= 0}
          onChange={(event) => event.target.value && onChange([...scorers, { id: event.target.value, goals: 1 }])}
          aria-label={`Ajouter un buteur, ${club.shortName}`}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="">{left <= 0 ? (goals === 0 ? "Aucun but à attribuer" : "Tous les buts sont attribués") : "+ Ajouter un buteur"}</option>
          {(["F", "M", "D"] as const).map((line) => (
            <optgroup key={line} label={LINE_LABELS[line]}>
              {available
                .filter((player) => player.line === line)
                .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name, "fr"))
                .map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                    {player.goals > 0 ? ` (${player.goals} but${player.goals > 1 ? "s" : ""} cette saison)` : ""}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      )}
    </div>
  );
}

function TeamPicker({
  label,
  club,
  clubs,
  onChange,
}: {
  label: string;
  club: ClubIndexEntry | null;
  clubs: ClubIndexEntry[];
  onChange: (club: ClubIndexEntry | null) => void;
}) {
  const league = club ? getLeague(club.league) : undefined;
  return (
    <div className={`${card} flex min-h-36 flex-col gap-3 p-4`}>
      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</h3>
      {club ? (
        <div className="flex flex-1 items-center gap-3">
          <TeamLogo team={club} size={48} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-2xl font-bold leading-tight">{club.name}</p>
            {league && (
              <p className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                <LeagueLogo league={league} size={14} />
                {league.name}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            Changer
          </button>
        </div>
      ) : (
        <ClubSearch clubs={clubs} onSelect={onChange} placeholder="Choisir un club (D1 ou D2)" />
      )}
    </div>
  );
}

// --- Déroulé du match ---

const STAT_ROWS: { key: keyof SimTeamStats; label: string; unit?: string }[] = [
  { key: "possession", label: "Possession", unit: "%" },
  { key: "shots", label: "Tirs" },
  { key: "onTarget", label: "Tirs cadrés" },
  { key: "corners", label: "Corners" },
  { key: "fouls", label: "Fautes" },
  { key: "offsides", label: "Hors-jeu" },
];

function StatsPanel({ values }: { values: Record<Side, SimTeamStats> }) {
  return (
    <ul className="space-y-3">
      {STAT_ROWS.map(({ key, label, unit = "" }) => {
        const home = values.home[key];
        const away = values.away[key];
        const share = home + away === 0 ? 0.5 : home / (home + away);
        return (
          <li key={key}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-display text-lg font-bold tabular-nums">
                {home}
                {unit}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
              <span className="font-display text-lg font-bold tabular-nums">
                {away}
                {unit}
              </span>
            </div>
            <div className="flex h-1.5 gap-1">
              <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="rounded-full bg-amber-400 transition-[width] duration-500" style={{ width: `${share * 100}%` }} />
              </div>
              <div className="flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-sky-400 transition-[width] duration-500" style={{ width: `${(1 - share) * 100}%` }} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

type FeedItem = { type: "event"; event: SimEvent; id: number } | { type: "marker"; label: string } | { type: "kick"; index: number };

function MatchView({
  match,
  clubs,
  squadsMissing,
  onReplay,
  onRedraw,
  onEdit,
}: {
  match: SimMatch;
  clubs: Record<Side, ClubIndexEntry>;
  squadsMissing: Side[];
  onReplay: () => void;
  onRedraw: () => void;
  onEdit: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("play");
  const [periodIndex, setPeriodIndex] = useState(0);
  const [at, setAt] = useState(0);
  const [kicksShown, setKicksShown] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [copied, setCopied] = useState(false);
  const period = match.periods[periodIndex];
  const periodLength = PERIOD_LENGTH[period] + match.addedTime[period];
  const finished = phase === "done";

  // Horloge du match : avance tant qu'une période est en cours et que le match n'est pas en pause.
  useEffect(() => {
    if (!playing || phase !== "play") return;
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const step = ((now - last) / 1000) * MINUTES_PER_SECOND * speed;
      last = now;
      setAt((value) => Math.min(periodLength, value + step));
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, phase, speed, periodLength]);

  // Fin d'une période : pause, prolongation, tirs au but ou coup de sifflet final.
  useEffect(() => {
    if (phase !== "play" || at < periodLength) return;
    if (periodIndex < match.periods.length - 1) setPhase("interval");
    else setPhase(match.shootout ? "shootout" : "done");
  }, [phase, at, periodLength, periodIndex, match]);

  useEffect(() => {
    if (phase !== "interval" || !playing) return;
    const timer = setTimeout(() => {
      setAt(0);
      setPeriodIndex((index) => index + 1);
      setPhase("play");
    }, INTERVAL_MS / speed);
    return () => clearTimeout(timer);
  }, [phase, playing, speed]);

  // Séance de tirs au but : un tir après l'autre.
  useEffect(() => {
    if (phase !== "shootout" || !playing || !match.shootout) return;
    const total = match.shootout.kicks.length;
    const timer = setTimeout(() => {
      if (kicksShown >= total) setPhase("done");
      else setKicksShown((count) => count + 1);
    }, KICK_MS / speed);
    return () => clearTimeout(timer);
  }, [phase, playing, speed, kicksShown, match]);

  // Événements déjà joués ; pendant une pause, toute la période écoulée.
  const shown = useMemo(() => {
    if (phase === "done" || phase === "shootout") return match.events;
    const current = match.periods[periodIndex];
    return match.events.filter(
      (event) => event.time.period < current || (event.time.period === current && (phase === "interval" || event.time.at <= at)),
    );
  }, [match, phase, periodIndex, at]);

  const kicks = match.shootout ? (finished ? match.shootout.kicks : match.shootout.kicks.slice(0, kicksShown)) : [];
  const shootoutScore = { home: 0, away: 0 };
  for (const kick of kicks) if (kick.scored) shootoutScore[kick.side] += 1;

  const score = { home: 0, away: 0 };
  for (const event of shown) if (event.kind === "goal") score[event.side] += 1;

  // Flash à chaque but, but refusé ou penalty manqué. Le minuteur dépend du seul flash : l'horloge
  // qui avance à chaque image ne doit pas l'annuler.
  const highlights = shown.filter((event) => event.kind === "goal" || event.kind === "varGoal" || event.kind === "penaltyMiss");
  const lastHighlight = highlights[highlights.length - 1];
  const [flash, setFlash] = useState<{ side: Side; label: string } | null>(null);
  const highlightsSeen = useRef(0);
  useEffect(() => {
    if (highlights.length > highlightsSeen.current && !finished && lastHighlight) {
      setFlash({
        side: lastHighlight.side,
        label: lastHighlight.kind === "goal" ? "But !" : lastHighlight.kind === "varGoal" ? "But refusé · VAR" : "Penalty manqué",
      });
    }
    highlightsSeen.current = highlights.length;
  }, [highlights.length, lastHighlight, finished]);
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 1600);
    return () => clearTimeout(timer);
  }, [flash]);

  const scorers = (side: Side) => {
    const byPlayer = new Map<string, { name: string; minutes: string[] }>();
    for (const event of shown) {
      if (event.kind !== "goal" || event.side !== side) continue;
      const key = `${event.scorer.id}-${event.ownGoal}`;
      const entry = byPlayer.get(key) ?? { name: event.scorer.shortName + (event.ownGoal ? " (csc)" : ""), minutes: [] };
      entry.minutes.push(formatSimMinute(event.time) + (event.penalty ? " (pen.)" : ""));
      byPlayer.set(key, entry);
    }
    return [...byPlayer.entries()];
  };
  const sentOff = (side: Side) => shown.filter((event) => event.kind === "red" && event.side === side).length;

  // Avancement : minutes jouées sur le total du match (prolongation comprise).
  const totalLength = match.periods.reduce((sum, item) => sum + PERIOD_LENGTH[item] + match.addedTime[item], 0);
  const elapsed =
    phase === "done" || phase === "shootout"
      ? totalLength
      : match.periods.slice(0, periodIndex).reduce((sum, item) => sum + PERIOD_LENGTH[item] + match.addedTime[item], 0) +
        (phase === "interval" ? periodLength : at);
  const progress = Math.min(1, elapsed / totalLength);

  // Statistiques en direct : une part des chiffres finaux, jamais en dessous de ce que justifient les événements.
  const liveStats = {} as Record<Side, SimTeamStats>;
  for (const side of SIDES) {
    const final = match.stats[side];
    const floor = statsFloor(shown, side);
    const scaled = (key: keyof typeof floor) => Math.min(final[key], Math.max(floor[key], Math.round(final[key] * progress)));
    const onTarget = scaled("onTarget");
    liveStats[side] = {
      possession: final.possession,
      onTarget,
      shots: Math.max(onTarget, scaled("shots")),
      corners: scaled("corners"),
      fouls: scaled("fouls"),
      offsides: scaled("offsides"),
    };
  }

  const extraTime = match.periods.length > 2;
  const clock =
    phase === "play"
      ? clockAt(period, at)
      : phase === "interval"
        ? INTERVAL_LABELS[periodIndex]
        : phase === "shootout"
          ? "Tirs au but"
          : `Terminé${match.shootout ? " (t.a.b.)" : extraTime ? " (a.p.)" : ""}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers refusé : le lien reste dans la barre d'adresse.
    }
  };

  // Fil du match, période par période, avec les tirs au but à la fin.
  const markers = ["Mi-temps", "Prolongation", "Mi-temps de la prolongation"];
  const feed: FeedItem[] = [{ type: "marker", label: "Coup d'envoi" }];
  let eventId = 0;
  match.periods.forEach((item, index) => {
    // La pause entre deux périodes s'affiche dès qu'elle commence.
    const started = phase === "done" || phase === "shootout" || periodIndex >= index || (periodIndex === index - 1 && phase === "interval");
    if (index > 0 && started) feed.push({ type: "marker", label: markers[index - 1] });
    for (const event of shown) if (event.time.period === item) feed.push({ type: "event", event, id: eventId++ });
  });
  if (match.shootout && (phase === "shootout" || finished)) {
    feed.push({ type: "marker", label: "Tirs au but" });
    kicks.forEach((_, index) => feed.push({ type: "kick", index }));
  }
  if (finished) feed.push({ type: "marker", label: "Fin du match" });

  const controlButton =
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";

  return (
    <div className="space-y-4">
      {/* Tableau de score façon écran de stade. */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-400/20 bg-[radial-gradient(120%_130%_at_50%_0%,#1d3f82_0%,#0b1a3d_55%,#020617_100%)] p-5 text-white shadow-xl sm:p-8">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          {SIDES.map((side) => (
            <div key={side} className={`flex min-w-0 flex-col items-center gap-2 text-center ${side === "away" ? "order-3" : ""}`}>
              <TeamLogo team={clubs[side]} size={64} />
              <p className="w-full truncate font-display text-lg font-bold sm:text-2xl">
                <span className="sm:hidden">{clubs[side].shortName}</span>
                <span className="max-sm:hidden">{clubs[side].name}</span>
              </p>
              <div className="flex h-4 items-center gap-1" aria-label={sentOff(side) ? `${sentOff(side)} expulsé(s)` : undefined}>
                {Array.from({ length: sentOff(side) }, (_, index) => (
                  <CardIcon key={index} color="red" />
                ))}
              </div>
            </div>
          ))}
          <div className="order-2 flex flex-col items-center gap-2">
            <p className="font-display text-6xl font-bold tabular-nums sm:text-8xl" aria-live="polite" aria-atomic>
              <span className={flash?.side === "home" && flash.label === "But !" ? "text-amber-300" : ""}>{score.home}</span>
              <span className="mx-2 text-white/40 sm:mx-3">-</span>
              <span className={flash?.side === "away" && flash.label === "But !" ? "text-amber-300" : ""}>{score.away}</span>
            </p>
            {match.shootout && (phase === "shootout" || finished) && (
              <p className="font-display text-lg font-bold tabular-nums text-amber-200">
                t.a.b. {shootoutScore.home} - {shootoutScore.away}
              </p>
            )}
            <p
              className={`rounded-full px-3 py-1 text-center font-display text-lg font-bold tabular-nums ${
                finished ? "bg-white/10 text-white" : "bg-red-500/20 text-red-200"
              }`}
            >
              {clock}
            </p>
          </div>
        </div>

        {flash && (
          <p className="pointer-events-none absolute inset-x-0 top-3 text-center font-display text-2xl font-black uppercase tracking-widest text-amber-300 drop-shadow-lg motion-safe:animate-bounce sm:text-3xl">
            {flash.label}
          </p>
        )}

        {/* Buteurs sous chaque équipe. */}
        <div className="mt-4 grid grid-cols-2 gap-6 text-sm text-white/80">
          {SIDES.map((side) => (
            <ul key={side} className={`space-y-0.5 ${side === "home" ? "text-left sm:text-center" : "text-right sm:text-center"}`}>
              {scorers(side).map(([key, scorer]) => (
                <li key={key}>
                  <span className="font-semibold text-white">{scorer.name}</span> {scorer.minutes.join(", ")}
                </li>
              ))}
            </ul>
          ))}
        </div>

        {/* Séance de tirs au but : un rond par tir. */}
        {match.shootout && (phase === "shootout" || finished) && (
          <div className="mt-4 space-y-1.5">
            {SIDES.map((side) => {
              const own = kicks.filter((kick) => kick.side === side);
              const pending = Math.max(0, 5 - own.length);
              return (
                <div key={side} className="flex items-center gap-2">
                  <TeamLogo team={clubs[side]} size={18} />
                  {own.map((kick, index) => (
                    <span
                      key={index}
                      title={`${kick.player.name} : ${kick.scored ? "marqué" : "manqué"}`}
                      className={`grid size-5 place-items-center rounded-full text-[10px] font-black ${kick.scored ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}
                    >
                      {kick.scored ? "✓" : "✕"}
                    </span>
                  ))}
                  {!finished &&
                    Array.from({ length: pending }, (_, index) => <span key={`p${index}`} className="size-5 rounded-full border border-white/20" />)}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-200" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {squadsMissing.length > 0 && (
        <p className="rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          Effectif indisponible pour {squadsMissing.map((side) => clubs[side].name).join(" et ")} : des joueurs génériques le remplacent.
        </p>
      )}

      {/* Commandes. */}
      <div className="flex flex-wrap items-center gap-2">
        {!finished ? (
          <>
            <button type="button" onClick={() => setPlaying((value) => !value)} className={controlButton}>
              {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
              {playing ? "Pause" : "Reprendre"}
            </button>
            <Segmented label="Vitesse" options={SPEEDS.map((value) => ({ value, label: `×${value}` }))} value={speed} onChange={setSpeed} />
            <button type="button" onClick={() => setPhase("done")} className={controlButton}>
              <FastForward className="size-4" aria-hidden />
              Coup de sifflet final
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onReplay} className={controlButton}>
              <RotateCcw className="size-4" aria-hidden />
              Revoir le match
            </button>
            <button type="button" onClick={onRedraw} className={controlButton}>
              <Shuffle className="size-4" aria-hidden />
              Nouveau tirage
            </button>
          </>
        )}
        <button type="button" onClick={onEdit} className={controlButton}>
          <Settings2 className="size-4" aria-hidden />
          Modifier les réglages
        </button>
        <button type="button" onClick={copyLink} className={controlButton}>
          <Link2 className="size-4" aria-hidden />
          {copied ? "Lien copié !" : "Copier le lien"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        {/* Fil du match, du plus récent au plus ancien. */}
        <section className={`${card} p-4`} aria-labelledby="sim-feed-title">
          <h2 id="sim-feed-title" className="mb-3 text-lg font-semibold">
            Le fil du match
          </h2>
          <ol className="space-y-1" aria-live="polite">
            {[...feed].reverse().map((item, index) => {
              if (item.type === "marker") {
                return (
                  <li key={`marker-${item.label}`} className="py-2 text-center text-xs font-bold uppercase tracking-wide text-slate-400">
                    {item.label}
                  </li>
                );
              }
              if (item.type === "kick") {
                const kick = kicks[item.index];
                return (
                  <li key={`kick-${item.index}`} className="flex items-center gap-3 rounded-xl px-3 py-2">
                    <span className="w-12 shrink-0 text-right font-display text-sm font-bold text-slate-500 dark:text-slate-400">
                      Tir {Math.floor(item.index / 2) + 1}
                    </span>
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-black text-white ${kick.scored ? "bg-emerald-500" : "bg-red-500"}`}
                      aria-hidden
                    >
                      {kick.scored ? "✓" : "✕"}
                    </span>
                    <p className="min-w-0 flex-1 text-sm font-medium">
                      {kick.player.name} : {kick.scored ? "marqué" : "manqué"}
                    </p>
                    <TeamLogo team={clubs[kick.side]} size={20} />
                  </li>
                );
              }
              return <EventRow key={item.id} event={item.event} club={clubs[item.event.side]} fresh={index === 0 && !finished} />;
            })}
          </ol>
        </section>

        <div className="space-y-4">
          <section className={`${card} p-4`} aria-labelledby="sim-stats-title">
            <h2 id="sim-stats-title" className="mb-3 flex items-center justify-between text-lg font-semibold">
              Statistiques
              <span className="flex gap-1.5">
                <TeamLogo team={clubs.home} size={18} />
                <TeamLogo team={clubs.away} size={18} />
              </span>
            </h2>
            <StatsPanel values={liveStats} />
          </section>

          {/* Compositions. */}
          <section className={`${card} p-4`} aria-labelledby="sim-lineups-title">
            <h2 id="sim-lineups-title" className="mb-3 text-lg font-semibold">
              Compositions
            </h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
              {SIDES.map((side) => (
                <div key={side}>
                  <p className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
                    <TeamLogo team={clubs[side]} size={18} />
                    <span className="truncate">{clubs[side].shortName}</span>
                  </p>
                  <ul className="space-y-0.5 text-sm">
                    {match.lineups[side].starters.map((player) => (
                      <LineupRow key={player.id} player={player} events={shown} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function EventRow({ event, club, fresh }: { event: SimEvent; club: ClubIndexEntry; fresh: boolean }) {
  const { title, detail } = eventText(event);
  const tone =
    event.kind === "goal" ? "bg-emerald-50 dark:bg-emerald-500/10" : event.kind === "varGoal" || event.kind === "penaltyMiss" ? "bg-slate-50 dark:bg-slate-800/60" : "";
  return (
    <li className={`flex items-start gap-3 rounded-xl px-3 py-2 ${tone} ${fresh ? "motion-safe:animate-[pulse_1s_ease-out_1]" : ""}`}>
      <span className="w-12 shrink-0 pt-0.5 text-right font-display text-lg font-bold tabular-nums text-slate-500 dark:text-slate-400">
        {formatSimMinute(event.time)}
      </span>
      <span className="grid h-7 w-6 shrink-0 place-items-center">
        <EventIcon event={event} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${event.kind === "goal" ? "font-bold" : "font-medium"} ${event.kind === "varGoal" ? "line-through decoration-slate-400" : ""}`}>
          {title}
        </p>
        {detail && <p className="text-xs text-slate-500 dark:text-slate-400">{detail}</p>}
      </div>
      <TeamLogo team={club} size={20} />
    </li>
  );
}

function LineupRow({ player, events }: { player: SimPlayer; events: SimEvent[] }) {
  let goals = 0;
  let yellow = false;
  let red = false;
  let subbedOff = false;
  let injured = false;
  for (const event of events) {
    if (event.kind === "goal" && !event.ownGoal && event.scorer.id === player.id) goals += 1;
    if (event.kind === "yellow" && event.player.id === player.id) yellow = true;
    if (event.kind === "red" && event.player.id === player.id) red = true;
    if (event.kind === "sub" && event.off.id === player.id) subbedOff = true;
    if (event.kind === "injury" && event.player.id === player.id) injured = true;
  }
  return (
    <li className={`flex items-center gap-2 ${red || subbedOff || injured ? "text-slate-400 dark:text-slate-500" : ""}`}>
      <span className="w-6 shrink-0 text-right text-xs tabular-nums text-slate-400">{player.jersey}</span>
      <span className="min-w-0 flex-1 truncate">{player.shortName}</span>
      {Array.from({ length: goals }, (_, index) => (
        <BallIcon key={index} className="size-3.5" />
      ))}
      {goals > 0 && <span className="sr-only">{goals > 1 ? `${goals} buts` : "1 but"}</span>}
      {yellow && <CardIcon color="yellow" />}
      {red && <CardIcon color="red" />}
      {injured && <Ambulance className="size-3.5 text-rose-400" aria-label="blessé" />}
      {subbedOff && <ArrowLeftRight className="size-3.5 text-slate-400" aria-label="remplacé" />}
    </li>
  );
}

// --- Page ---

export function MatchSimulator({ clubs }: { clubs: ClubIndexEntry[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const favorite = useFavoriteClub(1);
  const findClub = useCallback((key: string | null) => (key ? (clubs.find((club) => clubKey(club) === key) ?? null) : null), [clubs]);

  const [teams, setTeams] = useState<Record<Side, ClubIndexEntry | null>>(() => ({
    home: findClub(searchParams.get("dom")),
    away: findClub(searchParams.get("ext")),
  }));
  const [mode, setMode] = useState<Mode>("manual");
  const [settings, setSettingsState] = useState<SimSettings>(defaultSettings);
  const [intensity, setIntensity] = useState<{ goals: Intensity; cards: Intensity }>({ goals: 1, cards: 1 });
  const [run, setRun] = useState<Run | null>(null);
  const [match, setMatch] = useState<SimMatch | null>(null);
  const [replayKey, setReplayKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [squadsMissing, setSquadsMissing] = useState<Side[]>([]);
  const [squads, setSquads] = useState<Record<Side, SquadPlayer[] | null>>({ home: null, away: null });
  const squadCache = useRef(new Map<string, SquadPlayer[]>());

  const setSettings = useCallback((update: (current: SimSettings) => SimSettings) => setSettingsState((current) => normalize(update(current))), []);

  // Club favori en équipe à domicile quand rien n'est encore choisi.
  const favoriteApplied = useRef(false);
  useEffect(() => {
    if (favoriteApplied.current || !favorite) return;
    favoriteApplied.current = true;
    const club = findClub(`${favorite.league}.${favorite.team.id}`);
    setTeams((current) => (current.home || current.away?.id === club?.id ? current : { ...current, home: club }));
  }, [favorite, findClub]);

  const loadSquad = useCallback(async (club: ClubIndexEntry): Promise<SquadPlayer[]> => {
    const key = clubKey(club);
    const cached = squadCache.current.get(key);
    if (cached) return cached;
    try {
      const response = await fetch(`/api/teams/${club.league}/${club.id}/effectif`);
      const squad = response.ok ? ((await response.json()) as SquadPlayer[]) : [];
      if (squad.length > 0) squadCache.current.set(key, squad);
      return squad;
    } catch {
      return [];
    }
  }, []);

  // Effectifs chargés dès le choix des clubs : ils servent à choisir les buteurs.
  useEffect(() => {
    let cancelled = false;
    for (const side of SIDES) {
      const club = teams[side];
      if (!club) {
        setSquads((current) => ({ ...current, [side]: null }));
        continue;
      }
      loadSquad(club).then((squad) => {
        if (!cancelled) setSquads((current) => ({ ...current, [side]: squad }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [teams, loadSquad]);

  const launch = useCallback(
    async (next: Run, home: ClubIndexEntry, away: ClubIndexEntry) => {
      setLoading(true);
      const [homeSquad, awaySquad] = await Promise.all([loadSquad(home), loadSquad(away)]);
      setSquadsMissing(SIDES.filter((side) => (side === "home" ? homeSquad : awaySquad).length < 11));
      setRun(next);
      setMatch(simulateMatch(next.settings, { home: homeSquad, away: awaySquad }, next.seed));
      setReplayKey((value) => value + 1);
      setLoading(false);
      const params = new URLSearchParams({ dom: clubKey(home), ext: clubKey(away), r: encodeSettings(next.settings), graine: String(next.seed) });
      router.replace(`/simulateur?${params}`, { scroll: false });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [loadSquad, router],
  );

  // Lien partagé complet : le match se rejoue tel quel.
  const sharedLaunched = useRef(false);
  useEffect(() => {
    if (sharedLaunched.current) return;
    sharedLaunched.current = true;
    const seed = Number(searchParams.get("graine"));
    const shared = decodeSettings(searchParams.get("r")) ?? legacySettings(searchParams);
    const { home, away } = teams;
    if (!home || !away || !shared || !Number.isInteger(seed) || seed < 0) return;
    setSettingsState(shared);
    void launch({ settings: shared, seed, mode: "manual", intensity }, home, away);
  }, [searchParams, teams, launch, intensity]);

  const resolve = (seed: number, from: Run | null = null): SimSettings => {
    const currentMode = from?.mode ?? mode;
    const level = from?.intensity ?? intensity;
    const base = from?.settings ?? settings;
    return currentMode === "manual" ? base : randomSettings(createRng(seed ^ 0x5bd1e995), level.goals, level.cards, base);
  };

  const kickoff = () => {
    const { home, away } = teams;
    if (!home || !away) return;
    const seed = newSeed();
    void launch({ settings: resolve(seed), seed, mode, intensity }, home, away);
  };

  const redraw = () => {
    const { home, away } = teams;
    if (!run || !home || !away) return;
    const seed = newSeed();
    void launch({ ...run, settings: resolve(seed, run), seed }, home, away);
  };

  const setCount = (stat: SimCount, side: Side, value: number) =>
    setSettings((current) => ({ ...current, [stat]: { ...current[stat], [side]: Math.max(0, Math.min(SIM_LIMITS[stat], value)) } }));

  const rollCount = (stat: SimCount) => {
    const rng = createRng(newSeed());
    setSettings((current) => ({ ...current, [stat]: { home: randomCount(rng, stat, "home"), away: randomCount(rng, stat, "away") } }));
  };

  const chooseTeam = (side: Side, club: ClubIndexEntry | null) => {
    setTeams((current) => ({ ...current, [side]: club }));
    setSettings((current) => ({ ...current, scorers: { ...current.scorers, [side]: [] } }));
  };

  const otherClubs = (side: Side) => {
    const other = teams[side === "home" ? "away" : "home"];
    return other ? clubs.filter((club) => clubKey(club) !== clubKey(other)) : clubs;
  };

  if (match && run && teams.home && teams.away) {
    return (
      <MatchView
        key={replayKey}
        match={match}
        clubs={{ home: teams.home, away: teams.away }}
        squadsMissing={squadsMissing}
        onReplay={() => setReplayKey((value) => value + 1)}
        onRedraw={redraw}
        onEdit={() => {
          setMatch(null);
          setMode(run.mode);
          setSettingsState(run.mode === "manual" ? run.settings : { ...settings, knockout: run.settings.knockout, possession: run.settings.possession });
        }}
      />
    );
  }

  const ready = Boolean(teams.home && teams.away);
  const tiedAfter90 = settings.goals.home === settings.goals.away;

  return (
    <div className="space-y-6">
      <section aria-labelledby="sim-teams-title">
        <h2 id="sim-teams-title" className="mb-3 text-xl font-semibold">
          1. L&apos;affiche
        </h2>
        <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
          <TeamPicker label="Domicile" club={teams.home} clubs={otherClubs("home")} onChange={(club) => chooseTeam("home", club)} />
          <button
            type="button"
            onClick={() => {
              setTeams((current) => ({ home: current.away, away: current.home }));
              setSettings((current) => ({ ...current, scorers: { home: current.scorers.away, away: current.scorers.home } }));
            }}
            aria-label="Inverser domicile et extérieur"
            title="Inverser domicile et extérieur"
            className="mx-auto grid size-10 place-items-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <ArrowLeftRight className="size-4 rotate-90 md:rotate-0" aria-hidden />
          </button>
          <TeamPicker label="Extérieur" club={teams.away} clubs={otherClubs("away")} onChange={(club) => chooseTeam("away", club)} />
        </div>
      </section>

      <section aria-labelledby="sim-settings-title" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="sim-settings-title" className="text-xl font-semibold">
            2. Les réglages
          </h2>
          <Segmented
            label="Mode de réglage"
            options={[
              { value: "manual", label: "Je décide tout" },
              { value: "random", label: "Au hasard" },
            ]}
            value={mode}
            onChange={setMode}
          />
        </div>

        {mode === "manual" ? (
          <>
            <div className={`${card} space-y-5 p-4 sm:p-5`}>
              <h3 className="text-lg font-semibold">Le score</h3>
              <CountTable
                teams={teams}
                settings={settings}
                onChange={setCount}
                onRoll={rollCount}
                rows={[
                  { stat: "goals", label: "Buts", icon: <BallIcon /> },
                  { stat: "penalties", label: "dont sur penalty", max: (side) => maxGoals(settings, side) },
                  { stat: "missedPenalties", label: "Penaltys manqués" },
                  { stat: "varGoals", label: "Buts refusés (VAR)", icon: <VarIcon /> },
                ]}
              />
              <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                <h4 className="text-sm font-semibold">Buteurs imposés</h4>
                <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                  Choisis qui marque ; les autres buts sont tirés au sort selon les buts de la saison.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {SIDES.map((side) => (
                    <ScorerPicker
                      key={side}
                      club={teams[side]}
                      squad={squads[side]}
                      scorers={settings.scorers[side]}
                      goals={maxGoals(settings, side)}
                      onChange={(scorers) => setSettings((current) => ({ ...current, scorers: { ...current.scorers, [side]: scorers } }))}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className={`${card} space-y-4 p-4 sm:p-5`}>
              <h3 className="text-lg font-semibold">Discipline et blessures</h3>
              <CountTable
                teams={teams}
                settings={settings}
                onChange={setCount}
                onRoll={rollCount}
                rows={[
                  { stat: "yellows", label: "Cartons jaunes", icon: <CardIcon color="yellow" /> },
                  { stat: "reds", label: "Cartons rouges", icon: <CardIcon color="red" /> },
                  { stat: "injuries", label: "Blessures", icon: <Ambulance className="size-4 text-rose-500" aria-hidden /> },
                ]}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Un rouge peut tomber sur un second jaune : il compte alors aussi dans les jaunes. Chaque blessure force un changement
                (cinq au plus par équipe).
              </p>
            </div>
          </>
        ) : (
          <div className={`${card} grid gap-5 p-4 sm:grid-cols-2 sm:p-5`}>
            <div className="space-y-2">
              <p className="text-sm font-semibold">Le match</p>
              <Segmented
                label="Le match"
                options={GOAL_LEVELS.map((label, value) => ({ value: value as Intensity, label }))}
                value={intensity.goals}
                onChange={(goals) => setIntensity((current) => ({ ...current, goals }))}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Peu ou beaucoup de buts (penaltys et VAR compris), avec un léger avantage à l&apos;équipe qui reçoit.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold">L&apos;arbitre</p>
              <Segmented
                label="L'arbitre"
                options={CARD_LEVELS.map((label, value) => ({ value: value as Intensity, label }))}
                value={intensity.cards}
                onChange={(cards) => setIntensity((current) => ({ ...current, cards }))}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">Plus il est sévère, plus les cartons pleuvent.</p>
            </div>
          </div>
        )}

        {/* Réglages communs aux deux modes. */}
        <div className={`${card} space-y-5 p-4 sm:p-5`}>
          <h3 className="text-lg font-semibold">Le match</h3>
          <div className="space-y-2">
            <Toggle
              checked={settings.possession !== null}
              label="Choisir la possession"
              onChange={(checked) => setSettings((current) => ({ ...current, possession: checked ? 50 : null }))}
            />
            {settings.possession !== null ? (
              <div className="flex items-center gap-3">
                <span className="w-24 truncate text-right text-sm font-semibold">
                  {teams.home?.shortName ?? "Domicile"} {settings.possession}%
                </span>
                <input
                  type="range"
                  min={25}
                  max={75}
                  value={settings.possession}
                  onChange={(event) => setSettings((current) => ({ ...current, possession: Number(event.target.value) }))}
                  aria-label="Possession de l'équipe à domicile"
                  className="flex-1 accent-amber-500"
                />
                <span className="w-24 truncate text-sm font-semibold">
                  {100 - settings.possession}% {teams.away?.shortName ?? "Extérieur"}
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sinon, la possession, les tirs, les corners, les fautes et les hors-jeu sont calculés d&apos;après le match.
              </p>
            )}
          </div>
          <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Toggle
              checked={settings.knockout}
              label="Match à élimination directe"
              onChange={(knockout) => setSettings((current) => ({ ...current, knockout }))}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              En cas d&apos;égalité après 90 minutes : prolongation, puis tirs au but si l&apos;égalité persiste.
            </p>
            {settings.knockout && mode === "manual" && (
              <div className="space-y-4">
                {tiedAfter90 ? (
                  <CountTable
                    teams={teams}
                    settings={settings}
                    onChange={setCount}
                    onRoll={rollCount}
                    rows={[{ stat: "extraGoals", label: "Buts en prolongation", icon: <BallIcon /> }]}
                  />
                ) : (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                    Le score n&apos;est pas à égalité : pas de prolongation.
                  </p>
                )}
                {tiedAfter90 && maxGoals(settings, "home") === maxGoals(settings, "away") && (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold">Vainqueur aux tirs au but</span>
                    <Segmented
                      label="Vainqueur aux tirs au but"
                      options={SIDES.map((side) => ({ value: side, label: teams[side]?.shortName ?? (side === "home" ? "Domicile" : "Extérieur") }))}
                      value={settings.shootoutWinner}
                      onChange={(shootoutWinner) => setSettings((current) => ({ ...current, shootoutWinner }))}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={kickoff}
        disabled={!ready || loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 px-6 py-3.5 font-display text-xl font-bold uppercase tracking-wide text-amber-950 shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        <Play className="size-5" aria-hidden />
        {loading ? "Entrée des joueurs…" : ready ? "Coup d'envoi" : "Choisis les deux équipes"}
      </button>
    </div>
  );
}
