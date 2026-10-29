"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Dices, FastForward, Link2, Minus, Pause, Play, Plus, RotateCcw, Settings2, Shuffle } from "lucide-react";
import type { ClubIndexEntry } from "@/lib/clubs";
import { useFavoriteClub } from "@/lib/favorite-club";
import { getLeague } from "@/lib/leagues";
import {
  createRng,
  formatSimMinute,
  newSeed,
  randomSettings,
  randomStat,
  SIDES,
  SIM_LIMITS,
  simulateMatch,
  type Intensity,
  type Side,
  type SimEvent,
  type SimMatch,
  type SimPlayer,
  type SimSettings,
  type SimStat,
} from "@/lib/match-sim";
import type { SquadPlayer } from "@/lib/types";
import { ClubSearch } from "./ClubSearch";
import { LeagueLogo } from "./LeagueLogo";
import { TeamLogo } from "./TeamLogo";

// Simulateur de match : choix de l'affiche, réglages (score, cartons) ou tirage au hasard,
// puis le match se déroule minute par minute avec les vrais joueurs des deux clubs.

type Mode = "manual" | "random";
type Phase = "first" | "halftime" | "second" | "done";

interface Run {
  settings: SimSettings;
  seed: number;
  mode: Mode;
  intensity: { goals: Intensity; cards: Intensity };
}

const STATS: { key: SimStat; label: string }[] = [
  { key: "goals", label: "Buts" },
  { key: "yellows", label: "Cartons jaunes" },
  { key: "reds", label: "Cartons rouges" },
];

const GOAL_LEVELS = ["Fermé", "Équilibré", "Ouvert"] as const;
const CARD_LEVELS = ["Coulant", "Normal", "Sévère"] as const;
const SPEEDS = [1, 2, 4] as const;
// Minutes de jeu par seconde réelle à la vitesse ×1 : une période dure environ 22 secondes.
const MINUTES_PER_SECOND = 2;
const HALFTIME_MS = 1800;

const EMPTY_SETTINGS: SimSettings = { goals: { home: 2, away: 1 }, yellows: { home: 2, away: 2 }, reds: { home: 0, away: 0 } };

const card = "rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900";

// --- Lien partageable : /simulateur?dom=bundesliga.132&ext=ligue-2.165&buts=2-1&jaunes=1-3&rouges=0-0&graine=42 ---

const clubKey = (club: ClubIndexEntry) => `${club.league}.${club.id}`;

function pairParam(settings: SimSettings, stat: SimStat): string {
  return `${settings[stat].home}-${settings[stat].away}`;
}

function parsePair(value: string | null, max: number): Record<Side, number> | null {
  const match = value?.match(/^(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const home = Number(match[1]);
  const away = Number(match[2]);
  return home <= max && away <= max ? { home, away } : null;
}

const PARAM_NAMES: Record<SimStat, string> = { goals: "buts", yellows: "jaunes", reds: "rouges" };

// --- Petits éléments ---

function CardIcon({ color, className = "" }: { color: "yellow" | "red"; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-3.5 w-2.5 rounded-[2px] shadow-sm ${color === "yellow" ? "bg-yellow-400" : "bg-red-600"} ${className}`}
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

function EventIcon({ event }: { event: SimEvent }) {
  if (event.kind === "goal") return <BallIcon />;
  if (event.kind === "yellow") return <CardIcon color="yellow" />;
  if (event.kind === "sub") return <ArrowLeftRight className="size-4 text-emerald-500" aria-hidden />;
  if (event.secondYellow) {
    return (
      <span aria-hidden className="relative inline-flex w-4">
        <CardIcon color="yellow" />
        <CardIcon color="red" className="absolute left-1.5 top-0.5" />
      </span>
    );
  }
  return <CardIcon color="red" />;
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
    case "yellow":
      return { title: `Carton jaune : ${playerLabel(event.player)}`, detail: null };
    case "red":
      return {
        title: `${event.secondYellow ? "Second jaune, expulsion" : "Carton rouge"} : ${playerLabel(event.player)}`,
        detail: null,
      };
    case "sub":
      return { title: `Remplacement : ${event.on.name}`, detail: `Remplace ${event.off.name}` };
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

function Stepper({ value, max, label, onChange }: { value: number; max: number; label: string; onChange: (value: number) => void }) {
  const button =
    "grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800";
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={button} onClick={() => onChange(value - 1)} disabled={value <= 0} aria-label={`${label} : un de moins`}>
        <Minus className="size-4" aria-hidden />
      </button>
      <output aria-label={label} className="w-6 text-center font-display text-2xl font-bold tabular-nums">
        {value}
      </output>
      <button type="button" className={button} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`${label} : un de plus`}>
        <Plus className="size-4" aria-hidden />
      </button>
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

function clockLabel(phase: Phase, half: 1 | 2, at: number): string {
  if (phase === "halftime") return "Mi-temps";
  if (phase === "done") return "Terminé";
  const elapsed = Math.floor(at);
  return formatSimMinute(elapsed < 45 ? { minute: (half - 1) * 45 + elapsed + 1, extra: 0 } : { minute: half * 45, extra: elapsed - 44 });
}

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
  const [phase, setPhase] = useState<Phase>("first");
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [copied, setCopied] = useState(false);
  const half: 1 | 2 = phase === "first" ? 1 : 2;

  // Horloge du match : avance tant qu'une période est en cours et que le match n'est pas en pause.
  useEffect(() => {
    if (!playing || (phase !== "first" && phase !== "second")) return;
    const length = 45 + match.addedTime[phase === "first" ? 1 : 2];
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const step = ((now - last) / 1000) * MINUTES_PER_SECOND * speed;
      last = now;
      setAt((value) => Math.min(length, value + step));
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, phase, speed, match]);

  // Fin d'une période : mi-temps puis seconde période, ou coup de sifflet final.
  useEffect(() => {
    if (phase === "first" && at >= 45 + match.addedTime[1]) {
      setPhase("halftime");
    } else if (phase === "second" && at >= 45 + match.addedTime[2]) {
      setPhase("done");
    }
  }, [at, phase, match]);

  useEffect(() => {
    if (phase !== "halftime" || !playing) return;
    const timer = setTimeout(() => {
      setAt(0);
      setPhase("second");
    }, HALFTIME_MS / speed);
    return () => clearTimeout(timer);
  }, [phase, playing, speed]);

  // Événements déjà joués ; à la mi-temps, toute la première période.
  const shown = useMemo(
    () =>
      phase === "done"
        ? match.events
        : match.events.filter(
            (event) => event.time.half < half || (phase !== "halftime" && event.time.half === half && event.time.at <= at),
          ),
    [match, phase, half, at],
  );

  const score = { home: 0, away: 0 };
  for (const event of shown) if (event.kind === "goal") score[event.side] += 1;
  const goalsShown = score.home + score.away;

  // Flash « BUT ! » à chaque nouveau but. Le minuteur dépend du seul flash : l'horloge qui avance
  // à chaque image ne doit pas l'annuler.
  const lastGoalSide = [...shown].reverse().find((event) => event.kind === "goal")?.side ?? null;
  const [flash, setFlash] = useState<Side | null>(null);
  const goalsSeen = useRef(0);
  useEffect(() => {
    if (goalsShown > goalsSeen.current && phase !== "done") setFlash(lastGoalSide);
    goalsSeen.current = goalsShown;
  }, [goalsShown, lastGoalSide, phase]);
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
    return [...byPlayer.values()];
  };

  const sentOff = (side: Side) => shown.filter((event) => event.kind === "red" && event.side === side).length;

  const length = 45 + match.addedTime[half];
  const progress = phase === "done" ? 1 : phase === "halftime" ? 0.5 : (half - 1) * 0.5 + Math.min(1, at / length) * 0.5;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers refusé : le lien reste dans la barre d'adresse.
    }
  };

  const feed: ({ type: "event"; event: SimEvent; id: number } | { type: "marker"; label: string })[] = [
    { type: "marker", label: "Coup d'envoi" },
    ...shown.filter((event) => event.time.half === 1).map((event, id) => ({ type: "event" as const, event, id })),
  ];
  if (phase !== "first") feed.push({ type: "marker", label: "Mi-temps" });
  const firstHalfCount = feed.length;
  feed.push(...shown.filter((event) => event.time.half === 2).map((event, id) => ({ type: "event" as const, event, id: firstHalfCount + id })));
  if (phase === "done") feed.push({ type: "marker", label: "Fin du match" });

  const controlButton =
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";

  return (
    <div className="space-y-4">
      {/* Tableau de score façon écran de stade. */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-400/20 bg-[radial-gradient(120%_130%_at_50%_0%,#1d3f82_0%,#0b1a3d_55%,#020617_100%)] p-5 text-white shadow-xl sm:p-8">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          {SIDES.map((side) => {
            const club = clubs[side];
            const team = (
              <div key={side} className={`flex min-w-0 flex-col items-center gap-2 text-center ${side === "away" ? "order-3" : ""}`}>
                <TeamLogo team={club} size={64} />
                <p className="w-full truncate font-display text-lg font-bold sm:text-2xl">
                  <span className="sm:hidden">{club.shortName}</span>
                  <span className="max-sm:hidden">{club.name}</span>
                </p>
                <div className="flex h-4 items-center gap-1" aria-label={sentOff(side) ? `${sentOff(side)} expulsé(s)` : undefined}>
                  {Array.from({ length: sentOff(side) }, (_, index) => (
                    <CardIcon key={index} color="red" />
                  ))}
                </div>
              </div>
            );
            return team;
          })}
          <div className="order-2 flex flex-col items-center gap-2">
            <p className="font-display text-6xl font-bold tabular-nums sm:text-8xl" aria-live="polite" aria-atomic>
              <span className={flash === "home" ? "text-amber-300" : ""}>{score.home}</span>
              <span className="mx-2 text-white/40 sm:mx-3">-</span>
              <span className={flash === "away" ? "text-amber-300" : ""}>{score.away}</span>
            </p>
            <p
              className={`rounded-full px-3 py-1 font-display text-lg font-bold tabular-nums ${
                phase === "done" ? "bg-white/10 text-white" : "bg-red-500/20 text-red-200"
              }`}
            >
              {clockLabel(phase, half, at)}
            </p>
          </div>
        </div>

        {flash && (
          <p className="pointer-events-none absolute inset-x-0 top-3 text-center font-display text-3xl font-black uppercase tracking-widest text-amber-300 drop-shadow-lg motion-safe:animate-bounce">
            But !
          </p>
        )}

        {/* Buteurs sous chaque équipe. */}
        <div className="mt-4 grid grid-cols-2 gap-6 text-sm text-white/80">
          {SIDES.map((side) => (
            <ul key={side} className={`space-y-0.5 ${side === "home" ? "text-left sm:text-center" : "text-right sm:text-center"}`}>
              {scorers(side).map((scorer) => (
                <li key={scorer.name}>
                  <span className="font-semibold text-white">{scorer.name}</span> {scorer.minutes.join(", ")}
                </li>
              ))}
            </ul>
          ))}
        </div>

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
        {phase !== "done" ? (
          <>
            <button type="button" onClick={() => setPlaying((value) => !value)} className={controlButton}>
              {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
              {playing ? "Pause" : "Reprendre"}
            </button>
            <Segmented
              label="Vitesse"
              options={SPEEDS.map((value) => ({ value, label: `×${value}` }))}
              value={speed}
              onChange={setSpeed}
            />
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
            {[...feed].reverse().map((item, index) =>
              item.type === "marker" ? (
                <li key={`marker-${item.label}`} className="py-2 text-center text-xs font-bold uppercase tracking-wide text-slate-400">
                  {item.label}
                </li>
              ) : (
                <EventRow key={item.id} event={item.event} club={clubs[item.event.side]} fresh={index === 0 && phase !== "done"} />
              ),
            )}
          </ol>
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
  );
}

function EventRow({ event, club, fresh }: { event: SimEvent; club: ClubIndexEntry; fresh: boolean }) {
  const { title, detail } = eventText(event);
  return (
    <li
      className={`flex items-start gap-3 rounded-xl px-3 py-2 ${
        event.kind === "goal" ? "bg-emerald-50 dark:bg-emerald-500/10" : ""
      } ${fresh ? "motion-safe:animate-[pulse_1s_ease-out_1]" : ""}`}
    >
      <span className="w-12 shrink-0 pt-0.5 text-right font-display text-lg font-bold tabular-nums text-slate-500 dark:text-slate-400">
        {formatSimMinute(event.time)}
      </span>
      <span className="grid h-7 w-5 shrink-0 place-items-center">
        <EventIcon event={event} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${event.kind === "goal" ? "font-bold" : "font-medium"}`}>{title}</p>
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
  for (const event of events) {
    if (event.kind === "goal" && !event.ownGoal && event.scorer.id === player.id) goals += 1;
    if (event.kind === "yellow" && event.player.id === player.id) yellow = true;
    if (event.kind === "red" && event.player.id === player.id) red = true;
    if (event.kind === "sub" && event.off.id === player.id) subbedOff = true;
  }
  return (
    <li className={`flex items-center gap-2 ${red || subbedOff ? "text-slate-400 dark:text-slate-500" : ""}`}>
      <span className="w-6 shrink-0 text-right text-xs tabular-nums text-slate-400">{player.jersey}</span>
      <span className="min-w-0 flex-1 truncate">{player.shortName}</span>
      {Array.from({ length: goals }, (_, index) => (
        <BallIcon key={index} className="size-3.5" />
      ))}
      {goals > 0 && <span className="sr-only">{goals > 1 ? `${goals} buts` : "1 but"}</span>}
      {yellow && <CardIcon color="yellow" />}
      {red && <CardIcon color="red" />}
      {subbedOff && <ArrowLeftRight className="size-3.5 text-slate-400" aria-label="remplacé" />}
    </li>
  );
}

// --- Page ---

export function MatchSimulator({ clubs }: { clubs: ClubIndexEntry[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const favorite = useFavoriteClub(1);
  const findClub = useCallback((key: string | null) => (key ? clubs.find((club) => clubKey(club) === key) ?? null : null), [clubs]);

  const [teams, setTeams] = useState<Record<Side, ClubIndexEntry | null>>(() => ({
    home: findClub(searchParams.get("dom")),
    away: findClub(searchParams.get("ext")),
  }));
  const [mode, setMode] = useState<Mode>("manual");
  const [settings, setSettings] = useState<SimSettings>(EMPTY_SETTINGS);
  const [intensity, setIntensity] = useState<{ goals: Intensity; cards: Intensity }>({ goals: 1, cards: 1 });
  const [run, setRun] = useState<Run | null>(null);
  const [match, setMatch] = useState<SimMatch | null>(null);
  const [replayKey, setReplayKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [squadsMissing, setSquadsMissing] = useState<Side[]>([]);
  const squadCache = useRef(new Map<string, SquadPlayer[]>());

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

  const launch = useCallback(
    async (next: Run, home: ClubIndexEntry, away: ClubIndexEntry) => {
      setLoading(true);
      const [homeSquad, awaySquad] = await Promise.all([loadSquad(home), loadSquad(away)]);
      setSquadsMissing(SIDES.filter((side) => (side === "home" ? homeSquad : awaySquad).length < 11));
      setRun(next);
      setMatch(simulateMatch(next.settings, { home: homeSquad, away: awaySquad }, next.seed));
      setReplayKey((value) => value + 1);
      setLoading(false);
      const params = new URLSearchParams({ dom: clubKey(home), ext: clubKey(away) });
      for (const { key } of STATS) params.set(PARAM_NAMES[key], pairParam(next.settings, key));
      params.set("graine", String(next.seed));
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
    const goals = parsePair(searchParams.get("buts"), SIM_LIMITS.goals);
    const yellows = parsePair(searchParams.get("jaunes"), SIM_LIMITS.yellows);
    const reds = parsePair(searchParams.get("rouges"), SIM_LIMITS.reds);
    const { home, away } = teams;
    if (!home || !away || !goals || !yellows || !reds || !Number.isInteger(seed) || seed < 0) return;
    const shared = { goals, yellows, reds };
    setSettings(shared);
    void launch({ settings: shared, seed, mode: "manual", intensity }, home, away);
  }, [searchParams, teams, launch, intensity]);

  const kickoff = (seed = newSeed()) => {
    const { home, away } = teams;
    if (!home || !away) return;
    const resolved = mode === "manual" ? settings : randomSettings(createRng(seed ^ 0x5bd1e995), intensity.goals, intensity.cards);
    void launch({ settings: resolved, seed, mode, intensity }, home, away);
  };

  const redraw = () => {
    const { home, away } = teams;
    if (!run || !home || !away) return;
    const seed = newSeed();
    const resolved = run.mode === "manual" ? run.settings : randomSettings(createRng(seed ^ 0x5bd1e995), run.intensity.goals, run.intensity.cards);
    void launch({ ...run, settings: resolved, seed }, home, away);
  };

  const setStat = (stat: SimStat, side: Side, value: number) =>
    setSettings((current) => ({ ...current, [stat]: { ...current[stat], [side]: Math.max(0, Math.min(SIM_LIMITS[stat], value)) } }));

  const rollStat = (stat: SimStat) => {
    const rng = createRng(newSeed());
    setSettings((current) => ({
      ...current,
      [stat]: { home: randomStat(rng, stat, "home", 1), away: randomStat(rng, stat, "away", 1) },
    }));
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
          setSettings(run.settings);
        }}
      />
    );
  }

  const ready = Boolean(teams.home && teams.away);

  return (
    <div className="space-y-6">
      <section aria-labelledby="sim-teams-title">
        <h2 id="sim-teams-title" className="mb-3 text-xl font-semibold">
          1. L&apos;affiche
        </h2>
        <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
          <TeamPicker label="Domicile" club={teams.home} clubs={otherClubs("home")} onChange={(club) => setTeams((t) => ({ ...t, home: club }))} />
          <button
            type="button"
            onClick={() => setTeams((t) => ({ home: t.away, away: t.home }))}
            aria-label="Inverser domicile et extérieur"
            title="Inverser domicile et extérieur"
            className="mx-auto grid size-10 place-items-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <ArrowLeftRight className="size-4 rotate-90 md:rotate-0" aria-hidden />
          </button>
          <TeamPicker label="Extérieur" club={teams.away} clubs={otherClubs("away")} onChange={(club) => setTeams((t) => ({ ...t, away: club }))} />
        </div>
      </section>

      <section aria-labelledby="sim-settings-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
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

        <div className={`${card} p-4 sm:p-5`}>
          {mode === "manual" ? (
            <>
              <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 gap-y-4 sm:gap-x-6">
                <span />
                <span className="truncate text-center text-xs font-bold uppercase tracking-wide text-slate-400">
                  {teams.home?.shortName ?? "Domicile"}
                </span>
                <span className="truncate text-center text-xs font-bold uppercase tracking-wide text-slate-400">
                  {teams.away?.shortName ?? "Extérieur"}
                </span>
                <span />
                {STATS.map(({ key, label }) => (
                  <div key={key} className="contents">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {key === "yellows" && <CardIcon color="yellow" />}
                      {key === "reds" && <CardIcon color="red" />}
                      {key === "goals" && <BallIcon />}
                      {label}
                    </span>
                    {SIDES.map((side) => (
                      <Stepper
                        key={side}
                        value={settings[key][side]}
                        max={SIM_LIMITS[key]}
                        label={`${label}, ${side === "home" ? "domicile" : "extérieur"}`}
                        onChange={(value) => setStat(key, side, value)}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => rollStat(key)}
                      aria-label={`${label} au hasard`}
                      title="Tirer au hasard"
                      className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                      <Dices className="size-4" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                Un rouge peut tomber sur un second jaune : il compte alors aussi dans les jaunes. Buteurs, passeurs et joueurs avertis
                sont tirés parmi les vrais joueurs, selon leurs buts, passes et fautes de la saison.
              </p>
            </>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-semibold">Le match</p>
                <Segmented
                  label="Le match"
                  options={GOAL_LEVELS.map((label, value) => ({ value: value as Intensity, label }))}
                  value={intensity.goals}
                  onChange={(goals) => setIntensity((current) => ({ ...current, goals }))}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">Peu ou beaucoup de buts, avec un léger avantage à l&apos;équipe qui reçoit.</p>
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
        </div>
      </section>

      <button
        type="button"
        onClick={() => kickoff()}
        disabled={!ready || loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 px-6 py-3.5 font-display text-xl font-bold uppercase tracking-wide text-amber-950 shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        <Play className="size-5" aria-hidden />
        {loading ? "Entrée des joueurs…" : ready ? "Coup d'envoi" : "Choisis les deux équipes"}
      </button>
    </div>
  );
}
