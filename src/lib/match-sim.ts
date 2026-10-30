import type { SquadLine, SquadPlayer } from "./types";

// Moteur du simulateur de match : à partir des réglages (buts, penaltys, VAR, cartons, blessures…)
// et des effectifs réels, il compose les deux onze de départ, déroule la chronologie du match,
// la prolongation et la séance de tirs au but d'un match à élimination directe, et en tire les
// statistiques. Tout vient d'une graine : mêmes réglages et même graine donnent le même match.

export type Side = "home" | "away";
export const SIDES: readonly Side[] = ["home", "away"];
export type PerSide = Record<Side, number>;

/** Périodes : deux mi-temps, puis les deux de la prolongation. */
export type Period = 1 | 2 | 3 | 4;
const PERIOD_START: Record<Period, number> = { 1: 0, 2: 45, 3: 90, 4: 105 };
export const PERIOD_LENGTH: Record<Period, number> = { 1: 45, 2: 45, 3: 15, 4: 15 };

export interface ImposedScorer {
  id: string;
  goals: number;
}

export interface SimSettings {
  goals: PerSide;
  /** Buts marqués sur penalty, parmi les buts. */
  penalties: PerSide;
  missedPenalties: PerSide;
  /** Buts refusés par la VAR (ils ne comptent pas). */
  varGoals: PerSide;
  /** Cartons jaunes montrés, second jaune compris. */
  yellows: PerSide;
  /** Expulsions : rouge direct ou second jaune. */
  reds: PerSide;
  /** Blessures : chacune force un changement. */
  injuries: PerSide;
  /** Buteurs choisis ; les autres buts sont tirés au sort. */
  scorers: Record<Side, ImposedScorer[]>;
  /** Possession de l'équipe à domicile en %, ou null pour la laisser au hasard. */
  possession: number | null;
  /** Match à élimination directe : prolongation puis tirs au but en cas d'égalité. */
  knockout: boolean;
  /** Buts de la prolongation, joués seulement en cas d'égalité après 90 minutes. */
  extraGoals: PerSide;
  /** Vainqueur de la séance de tirs au but si l'égalité persiste. */
  shootoutWinner: Side;
}

export type SimCount = "goals" | "penalties" | "missedPenalties" | "varGoals" | "yellows" | "reds" | "injuries" | "extraGoals";

export const SIM_LIMITS: Record<SimCount, number> = {
  goals: 9,
  penalties: 9,
  missedPenalties: 3,
  varGoals: 3,
  yellows: 8,
  reds: 3,
  injuries: 3,
  extraGoals: 3,
};

const MAX_SUBS = 5;

/** Intensité d'un réglage tiré au hasard : 0 faible, 1 normale, 2 forte. */
export type Intensity = 0 | 1 | 2;

export interface SimPlayer {
  id: string;
  name: string;
  shortName: string;
  jersey: string | null;
  line: SquadLine;
}

/** Instant d'un événement : minute réglementaire et temps additionnel éventuel (45+2 → minute 45, extra 2). */
export interface SimTime {
  period: Period;
  minute: number;
  extra: number;
  /** Minutes de jeu écoulées depuis le début de la période : sert à l'ordre et au déroulé. */
  at: number;
}

export type SimEvent = { side: Side; time: SimTime } & (
  | { kind: "goal"; scorer: SimPlayer; assist: SimPlayer | null; ownGoal: boolean; penalty: boolean }
  | { kind: "penaltyMiss"; player: SimPlayer; keeper: SimPlayer | null; saved: boolean }
  | { kind: "varGoal"; player: SimPlayer; reason: string }
  | { kind: "yellow"; player: SimPlayer }
  | { kind: "red"; player: SimPlayer; secondYellow: boolean }
  | { kind: "sub"; on: SimPlayer; off: SimPlayer }
  | { kind: "injury"; player: SimPlayer; replacement: SimPlayer | null }
);

export interface SimLineup {
  starters: SimPlayer[];
  bench: SimPlayer[];
}

export interface ShootoutKick {
  side: Side;
  player: SimPlayer;
  scored: boolean;
}

export interface SimShootout {
  kicks: ShootoutKick[];
  score: PerSide;
  winner: Side;
}

export interface SimTeamStats {
  possession: number;
  shots: number;
  onTarget: number;
  corners: number;
  fouls: number;
  offsides: number;
}

export interface SimMatch {
  lineups: Record<Side, SimLineup>;
  /** Dans l'ordre du match. */
  events: SimEvent[];
  periods: Period[];
  /** Temps additionnel de chaque période, en minutes. */
  addedTime: Record<Period, number>;
  /** Score à la fin du jeu (prolongation comprise), hors tirs au but. */
  score: PerSide;
  shootout: SimShootout | null;
  /** Statistiques de fin de match. */
  stats: Record<Side, SimTeamStats>;
}

// --- Hasard reproductible ---

export type Rng = () => number;

/** Générateur pseudo-aléatoire mulberry32 : rapide, et identique d'un navigateur à l'autre. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

function intBetween(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function poisson(rng: Rng, mean: number): number {
  const limit = Math.exp(-mean);
  let count = 0;
  let product = rng();
  while (product > limit) {
    count += 1;
    product *= rng();
  }
  return count;
}

function shuffle<T>(rng: Rng, items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(rng() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

function pickWeighted<T>(rng: Rng, items: readonly T[], weight: (item: T) => number): T | undefined {
  if (items.length === 0) return undefined;
  const weights = items.map((item) => Math.max(0, weight(item)));
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return items[Math.floor(rng() * items.length)];
  let roll = rng() * total;
  for (let index = 0; index < items.length; index++) {
    roll -= weights[index];
    if (roll < 0) return items[index];
  }
  return items[items.length - 1];
}

// --- Réglages ---

export function defaultSettings(): SimSettings {
  const zero = () => ({ home: 0, away: 0 });
  return {
    goals: { home: 2, away: 1 },
    penalties: zero(),
    missedPenalties: zero(),
    varGoals: zero(),
    yellows: { home: 2, away: 2 },
    reds: zero(),
    injuries: zero(),
    scorers: { home: [], away: [] },
    possession: null,
    knockout: false,
    extraGoals: zero(),
    shootoutWinner: "home",
  };
}

// Moyennes par équipe : buts selon l'ouverture du match, cartons selon la sévérité de l'arbitre.
const GOAL_MEANS = [0.75, 1.35, 2.2];
const YELLOW_MEANS = [1.1, 2.1, 3.4];
const RED_MEANS = [0.03, 0.1, 0.32];
const VAR_MEANS = [0.08, 0.15, 0.3];
const HOME_ADVANTAGE: Record<Side, number> = { home: 1.15, away: 0.9 };

/** Une ligne de réglage tirée au hasard, à intensité normale par défaut. */
export function randomCount(rng: Rng, stat: SimCount, side: Side, intensity: Intensity = 1): number {
  const means: Record<SimCount, number> = {
    goals: GOAL_MEANS[intensity] * HOME_ADVANTAGE[side],
    penalties: 0.15,
    missedPenalties: 0.06,
    varGoals: VAR_MEANS[intensity],
    yellows: YELLOW_MEANS[intensity],
    reds: RED_MEANS[intensity],
    injuries: 0.25,
    extraGoals: GOAL_MEANS[intensity] * 0.3,
  };
  return Math.min(SIM_LIMITS[stat], poisson(rng, means[stat]));
}

/** Réglages tirés au hasard ; le type de match et la possession choisis restent tels quels. */
export function randomSettings(
  rng: Rng,
  goals: Intensity,
  cards: Intensity,
  keep: Pick<SimSettings, "knockout" | "possession">,
): SimSettings {
  const row = (stat: SimCount, intensity: Intensity = 1) => ({
    home: randomCount(rng, stat, "home", intensity),
    away: randomCount(rng, stat, "away", intensity),
  });
  const goalRow = row("goals", goals);
  // Chaque but a environ une chance sur huit d'être un penalty.
  const penaltiesAmong = (count: number) => Array.from({ length: count }).filter(() => rng() < 0.12).length;
  return {
    goals: goalRow,
    penalties: { home: penaltiesAmong(goalRow.home), away: penaltiesAmong(goalRow.away) },
    missedPenalties: row("missedPenalties"),
    varGoals: row("varGoals", goals),
    yellows: row("yellows", cards),
    reds: row("reds", cards),
    injuries: row("injuries"),
    scorers: { home: [], away: [] },
    possession: keep.possession,
    knockout: keep.knockout,
    extraGoals: row("extraGoals", goals),
    shootoutWinner: rng() < 0.5 ? "home" : "away",
  };
}

/** Réglages relus depuis un lien : chaque valeur est bornée, rien n'est pris tel quel. */
export function sanitizeSettings(value: unknown): SimSettings | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const settings = defaultSettings();
  const count = (stat: SimCount) => {
    const row = input[stat] as Record<string, unknown> | undefined;
    for (const side of SIDES) {
      const raw = Number(row?.[side] ?? 0);
      settings[stat][side] = Number.isFinite(raw) ? Math.max(0, Math.min(SIM_LIMITS[stat], Math.floor(raw))) : 0;
    }
  };
  for (const stat of Object.keys(SIM_LIMITS) as SimCount[]) count(stat);
  const scorers = input.scorers as Record<string, unknown> | undefined;
  for (const side of SIDES) {
    const list = Array.isArray(scorers?.[side]) ? (scorers[side] as unknown[]) : [];
    settings.scorers[side] = list.slice(0, SIM_LIMITS.goals).flatMap((item) => {
      const entry = item as Record<string, unknown> | null;
      const id = typeof entry?.id === "string" && /^[\w-]{1,32}$/.test(entry.id) ? entry.id : null;
      const goals = Math.max(1, Math.min(SIM_LIMITS.goals, Math.floor(Number(entry?.goals) || 1)));
      return id ? [{ id, goals }] : [];
    });
  }
  const possession = Number(input.possession);
  settings.possession = input.possession === null || !Number.isFinite(possession) ? null : Math.max(25, Math.min(75, Math.round(possession)));
  settings.knockout = input.knockout === true;
  settings.shootoutWinner = input.shootoutWinner === "away" ? "away" : "home";
  return settings;
}

// --- Compositions ---

const FORMATION: Record<SquadLine, number> = { G: 1, D: 4, M: 3, F: 3 };
const BENCH_SIZE = 9;

function toSimPlayer(player: SquadPlayer): SimPlayer {
  return { id: player.id, name: player.name, shortName: player.shortName, jersey: player.jersey, line: player.line };
}

/** Effectif de secours quand ESPN ne répond pas : des joueurs sans nom, numérotés. */
function genericSquad(): SquadPlayer[] {
  const lines: SquadLine[] = ["G", "D", "D", "D", "D", "M", "M", "M", "F", "F", "F", "G", "D", "D", "M", "M", "F", "F", "D", "M"];
  return lines.map((line, index) => {
    const jersey = String(index + 1);
    return {
      id: `generique-${jersey}`,
      name: `Joueur n°${jersey}`,
      shortName: `N°${jersey}`,
      jersey,
      line,
      goals: line === "F" ? 2 : line === "M" ? 1 : 0,
      assists: line === "M" ? 1 : 0,
      appearances: 0,
      yellowCards: 0,
      fouls: 0,
    };
  });
}

/** Onze type en 4-3-3 d'après le temps de jeu de la saison (buteurs imposés titularisés), puis le banc. */
function buildLineup(rng: Rng, squad: SquadPlayer[], imposed: Set<string>) {
  const pool = squad.length >= 11 ? squad : genericSquad();
  // Petit bruit pour départager les joueurs à égalité (début de saison, effectif peu utilisé).
  const ranked = pool
    .map((player) => ({ player, rank: player.appearances + rng() * 0.9 + (imposed.has(player.id) ? 1000 : 0) }))
    .sort((a, b) => b.rank - a.rank)
    .map((item) => item.player);

  const starters: SquadPlayer[] = [];
  for (const line of ["G", "D", "M", "F"] as const) {
    starters.push(...ranked.filter((player) => player.line === line).slice(0, FORMATION[line]));
  }
  // Buteur imposé hors du onze (ligne déjà pleine) : il prend la place du moins utilisé de sa ligne.
  // Ligne entière de buteurs imposés : il prend celle d'un autre joueur de champ.
  for (const player of ranked.filter((item) => imposed.has(item.id) && !starters.includes(item))) {
    const replaceable = [...starters].reverse().filter((item) => !imposed.has(item.id) && item.line !== "G");
    const replaced = replaceable.find((item) => item.line === player.line) ?? replaceable[0];
    if (replaced) starters.splice(starters.indexOf(replaced), 1, player);
  }
  // Ligne incomplète : on complète avec les joueurs de champ les plus utilisés.
  for (const player of ranked) {
    if (starters.length >= 11) break;
    if (!starters.includes(player) && player.line !== "G") starters.push(player);
  }
  const bench = ranked.filter((player) => !starters.includes(player)).slice(0, BENCH_SIZE);

  return {
    lineup: { starters: starters.map(toSimPlayer), bench: bench.map(toSimPlayer) },
    stats: new Map(pool.map((player) => [player.id, player])),
  };
}

// --- Chronologie ---

function timeAt(period: Period, at: number): SimTime {
  const elapsed = Math.floor(at);
  const length = PERIOD_LENGTH[period];
  const minute = elapsed < length ? PERIOD_START[period] + elapsed + 1 : PERIOD_START[period] + length;
  const extra = elapsed < length ? 0 : elapsed - length + 1;
  return { period, minute, extra, at: elapsed + 0.5 };
}

/**
 * Instant tiré parmi des périodes (au prorata de leur durée), avec une densité qui croît au fil
 * des minutes (`slope`) et une part réservée à la seconde période (`secondHalfShare`).
 */
function randomTime(
  rng: Rng,
  addedTime: Record<Period, number>,
  { periods = [1, 2], slope = 0.6, secondHalfShare = 0.55, minAt = 0 }: { periods?: Period[]; slope?: number; secondHalfShare?: number; minAt?: number } = {},
): SimTime {
  const weights = periods.map((period) => (period === 2 ? secondHalfShare * 2 : period === 1 ? (1 - secondHalfShare) * 2 : 1) * PERIOD_LENGTH[period]);
  const period = pickWeighted(rng, periods, (item) => weights[periods.indexOf(item)]) ?? 1;
  const length = PERIOD_LENGTH[period] + addedTime[period];
  const start = Math.min(minAt, length - 1);
  let at = start;
  // Tirage par rejet : la densité 1 + slope × t/length favorise les fins de période.
  for (let tries = 0; tries < 50; tries++) {
    at = start + rng() * (length - start);
    if (rng() * (1 + slope) < 1 + (slope * at) / length) break;
  }
  return timeAt(period, at);
}

function compareTime(a: SimTime, b: SimTime): number {
  return a.period - b.period || a.at - b.at;
}

/** Libellé d'une minute : « 34' », « 45+2' », « 105+1' ». */
export function formatSimMinute(time: Pick<SimTime, "minute" | "extra">): string {
  return time.extra > 0 ? `${time.minute}+${time.extra}'` : `${time.minute}'`;
}

/** Minute affichée pendant le déroulé, `at` minutes après le début de la période. */
export function clockAt(period: Period, at: number): string {
  return formatSimMinute(timeAt(period, at));
}

type Slot = { side: Side; time: SimTime } & (
  | { kind: "goal"; penalty: boolean; scorer: string | null }
  | { kind: "penaltyMiss" }
  | { kind: "varGoal" }
  | { kind: "yellow"; pair: number | null }
  | { kind: "red"; pair: number | null }
  | { kind: "sub" }
  | { kind: "injury" }
);

const SCORING: Record<SquadLine, number> = { G: 0.02, D: 0.8, M: 2.2, F: 5 };
const ASSISTING: Record<SquadLine, number> = { G: 0.05, D: 1, M: 3, F: 2 };
const BOOKING: Record<SquadLine, number> = { G: 0.15, D: 1.2, M: 1, F: 0.7 };
const VAR_REASONS = ["hors-jeu", "main", "faute préalable", "hors-jeu de position"];

export function simulateMatch(settings: SimSettings, squads: Record<Side, SquadPlayer[]>, seed: number): SimMatch {
  const rng = createRng(seed);
  const other = (side: Side): Side => (side === "home" ? "away" : "home");
  const imposedIds = (side: Side) => new Set(settings.scorers[side].map((scorer) => scorer.id));
  const built = { home: buildLineup(rng, squads.home, imposedIds("home")), away: buildLineup(rng, squads.away, imposedIds("away")) };
  const statsOf = (side: Side, player: SimPlayer) => built[side].stats.get(player.id);
  const addedTime: Record<Period, number> = { 1: intBetween(rng, 1, 4), 2: intBetween(rng, 2, 6), 3: intBetween(rng, 0, 2), 4: intBetween(rng, 0, 3) };

  // Prolongation seulement si le match à élimination directe est à égalité après 90 minutes.
  const extraTime = settings.knockout && settings.goals.home === settings.goals.away;
  const periods: Period[] = extraTime ? [1, 2, 3, 4] : [1, 2];

  // 1. Les instants de chaque événement, avant de savoir qui en est l'auteur.
  const slots: Slot[] = [];
  let pairs = 0;
  for (const side of SIDES) {
    const goalSlots: Extract<Slot, { kind: "goal" }>[] = [];
    for (let index = 0; index < settings.goals[side]; index++) {
      goalSlots.push({ side, kind: "goal", penalty: false, scorer: null, time: randomTime(rng, addedTime) });
    }
    if (extraTime) {
      for (let index = 0; index < settings.extraGoals[side]; index++) {
        goalSlots.push({ side, kind: "goal", penalty: false, scorer: null, time: randomTime(rng, addedTime, { periods: [3, 4], slope: 0.4 }) });
      }
    }
    // Penaltys et buteurs imposés, répartis sur des buts tirés au sort.
    for (const slot of shuffle(rng, goalSlots).slice(0, settings.penalties[side])) slot.penalty = true;
    const quotas = settings.scorers[side].flatMap((scorer) => Array.from({ length: scorer.goals }, () => scorer.id));
    shuffle(rng, goalSlots)
      .slice(0, quotas.length)
      .forEach((slot, index) => (slot.scorer = quotas[index]));
    slots.push(...goalSlots);

    for (let index = 0; index < settings.missedPenalties[side]; index++) {
      slots.push({ side, kind: "penaltyMiss", time: randomTime(rng, addedTime, { periods }) });
    }
    for (let index = 0; index < settings.varGoals[side]; index++) {
      slots.push({ side, kind: "varGoal", time: randomTime(rng, addedTime, { periods }) });
    }

    // Un second jaune réclame un premier jaune plus tôt, au même joueur : il consomme deux jaunes.
    const reds = settings.reds[side];
    let secondYellows = 0;
    for (let index = 0; index < reds; index++) {
      if (settings.yellows[side] - 2 * (secondYellows + 1) >= 0 && rng() < 0.5) secondYellows += 1;
    }
    for (let index = 0; index < reds; index++) {
      const second = index < secondYellows;
      const time = randomTime(rng, addedTime, { slope: 1.2, secondHalfShare: 0.7, minAt: second ? 8 : 0 });
      if (second) {
        const pair = pairs++;
        // Le premier jaune précède l'expulsion : en première période, ou plus tôt dans la même.
        const first = time.period === 2 && rng() < 0.5 ? timeAt(1, rng() * 45) : timeAt(time.period, rng() * (time.at - 1));
        slots.push({ side, kind: "yellow", pair, time: first });
        slots.push({ side, kind: "red", pair, time });
      } else {
        slots.push({ side, kind: "red", pair: null, time });
      }
    }
    for (let index = 0; index < settings.yellows[side] - 2 * secondYellows; index++) {
      slots.push({ side, kind: "yellow", pair: null, time: randomTime(rng, addedTime, { slope: 0.9, secondHalfShare: 0.6 }) });
    }

    const injuries = settings.injuries[side];
    for (let index = 0; index < injuries; index++) {
      slots.push({ side, kind: "injury", time: randomTime(rng, addedTime, { periods, slope: 0.2, secondHalfShare: 0.5 }) });
    }
    // Changements tactiques en seconde période, dans la limite de cinq avec les blessures.
    const outfieldBench = built[side].lineup.bench.filter((player) => player.line !== "G").length;
    for (let index = 0; index < Math.min(3, MAX_SUBS - injuries, outfieldBench); index++) {
      slots.push({ side, kind: "sub", time: timeAt(2, intBetween(rng, 10, 40) + rng()) });
    }
  }
  slots.sort((a, b) => compareTime(a.time, b.time));

  // 2. Les auteurs, dans l'ordre du match : un joueur remplacé ou expulsé ne revient pas.
  const onPitch = { home: [...built.home.lineup.starters], away: [...built.away.lineup.starters] };
  const bench = { home: [...built.home.lineup.bench], away: [...built.away.lineup.bench] };
  const booked = new Set<string>();
  const pairPlayer = new Map<number, SimPlayer>();
  const pairRedTime = new Map<number, SimTime>();
  for (const slot of slots) if (slot.kind === "red" && slot.pair !== null) pairRedTime.set(slot.pair, slot.time);
  const events: SimEvent[] = [];
  const leave = (side: Side, player: SimPlayer) => {
    onPitch[side] = onPitch[side].filter((item) => item.id !== player.id);
  };
  const enter = (side: Side, player: SimPlayer) => {
    onPitch[side].push(player);
    bench[side] = bench[side].filter((item) => item.id !== player.id);
  };

  // Joueurs qui doivent rester sur le terrain après `time` : buteur imposé qui n'a pas fini de marquer,
  // joueur averti qui doit encore prendre son second jaune.
  const mustStay = (time: SimTime) => {
    const ids = new Set<string>();
    for (const item of slots) {
      if (compareTime(item.time, time) <= 0) continue;
      if (item.kind === "goal" && item.scorer) ids.add(item.scorer);
      if (item.kind === "red" && item.pair !== null) {
        const player = pairPlayer.get(item.pair);
        if (player) ids.add(player.id);
      }
    }
    return ids;
  };
  const goalsOf = (side: Side, player: SimPlayer) => statsOf(side, player)?.goals ?? 0;
  const penaltyTaker = (side: Side) =>
    [...onPitch[side]].filter((player) => player.line !== "G").sort((a, b) => goalsOf(side, b) - goalsOf(side, a) || SCORING[b.line] - SCORING[a.line])[0];
  const keeperOf = (side: Side) => onPitch[side].find((player) => player.line === "G") ?? null;
  const replacementFor = (side: Side, player: SimPlayer) =>
    bench[side].find((item) => item.line === player.line) ?? (player.line === "G" ? undefined : bench[side].find((item) => item.line !== "G"));

  for (const slot of slots) {
    const { side, time } = slot;
    const players = onPitch[side];
    switch (slot.kind) {
      case "goal": {
        const imposed = slot.scorer ? players.find((player) => player.id === slot.scorer) : undefined;
        const ownGoal = !imposed && !slot.penalty && rng() < 0.04 && onPitch[other(side)].length > 0;
        if (ownGoal) {
          const scorer = pickWeighted(rng, onPitch[other(side)], (player) => (player.line === "D" ? 3 : player.line === "G" ? 0.5 : 1));
          if (scorer) events.push({ kind: "goal", side, time, scorer, assist: null, ownGoal, penalty: false });
          break;
        }
        // Penalty : le meilleur buteur présent le tire, sauf buteur imposé.
        const scorer =
          imposed ?? (slot.penalty ? penaltyTaker(side) : pickWeighted(rng, players, (player) => SCORING[player.line] + goalsOf(side, player) * 1.3));
        if (!scorer) break;
        const assist =
          slot.penalty || rng() > 0.72
            ? null
            : (pickWeighted(
                rng,
                players.filter((player) => player.id !== scorer.id),
                (player) => ASSISTING[player.line] + (statsOf(side, player)?.assists ?? 0) * 1.2,
              ) ?? null);
        events.push({ kind: "goal", side, time, scorer, assist, ownGoal: false, penalty: slot.penalty });
        break;
      }
      case "penaltyMiss": {
        const player = penaltyTaker(side);
        if (player) events.push({ kind: "penaltyMiss", side, time, player, keeper: keeperOf(other(side)), saved: rng() < 0.6 });
        break;
      }
      case "varGoal": {
        const player = pickWeighted(rng, players, (item) => SCORING[item.line] + goalsOf(side, item));
        if (player) events.push({ kind: "varGoal", side, time, player, reason: VAR_REASONS[Math.floor(rng() * VAR_REASONS.length)] });
        break;
      }
      case "yellow":
      case "red": {
        const paired = slot.pair !== null ? pairPlayer.get(slot.pair) : undefined;
        const bookingWeight = (player: SimPlayer) => {
          const stats = statsOf(side, player);
          return BOOKING[player.line] * (1 + (stats?.fouls ?? 0) * 0.15 + (stats?.yellowCards ?? 0) * 0.8);
        };
        // Un expulsé ne doit pas manquer un but ou un second jaune prévu plus tard.
        const staying = mustStay(slot.kind === "red" ? time : (slot.pair !== null ? pairRedTime.get(slot.pair) : undefined) ?? time);
        const candidates = players.filter((player) => {
          if (slot.kind === "red") return !staying.has(player.id);
          // Un jaune « simple » ne tombe pas sur un joueur déjà averti : ce serait une expulsion non prévue.
          return !booked.has(player.id) && (slot.pair === null || !staying.has(player.id));
        });
        const player = paired ?? pickWeighted(rng, candidates.length > 0 ? candidates : players, bookingWeight);
        if (!player) break;
        if (slot.kind === "yellow") {
          booked.add(player.id);
          if (slot.pair !== null) pairPlayer.set(slot.pair, player);
          events.push({ kind: "yellow", side, time, player });
        } else {
          leave(side, player);
          events.push({ kind: "red", side, time, player, secondYellow: paired !== undefined });
        }
        break;
      }
      case "injury": {
        const staying = mustStay(time);
        const player = pickWeighted(
          rng,
          players.filter((item) => !staying.has(item.id)),
          (item) => (item.line === "G" ? 0.15 : 1),
        );
        if (!player) break;
        const replacement = replacementFor(side, player) ?? null;
        leave(side, player);
        if (replacement) enter(side, replacement);
        events.push({ kind: "injury", side, time, player, replacement });
        break;
      }
      case "sub": {
        // Sort en priorité un joueur averti, jamais un joueur qui doit encore marquer ou être expulsé.
        const staying = mustStay(time);
        const off = pickWeighted(
          rng,
          players.filter((player) => player.line !== "G" && !staying.has(player.id)),
          (player) => (booked.has(player.id) ? 3 : 1) * (player.line === "F" ? 1.4 : 1),
        );
        const on = off ? replacementFor(side, off) : undefined;
        if (!off || !on) break;
        leave(side, off);
        enter(side, on);
        events.push({ kind: "sub", side, time, on, off });
        break;
      }
    }
  }

  const score = { home: 0, away: 0 };
  for (const event of events) if (event.kind === "goal") score[event.side] += 1;

  const shootout = settings.knockout && score.home === score.away ? playShootout(rng, onPitch, settings.shootoutWinner, goalsOf) : null;

  return {
    lineups: { home: built.home.lineup, away: built.away.lineup },
    events,
    periods,
    addedTime,
    score,
    shootout,
    stats: matchStats(rng, settings, events, score, extraTime),
  };
}

/** Séance de tirs au but : cinq tirs chacun, puis mort subite, jusqu'à la victoire du vainqueur choisi. */
function playShootout(
  rng: Rng,
  onPitch: Record<Side, SimPlayer[]>,
  winner: Side,
  goalsOf: (side: Side, player: SimPlayer) => number,
): SimShootout {
  // Les tireurs : les joueurs de champ les plus adroits d'abord, le gardien en dernier.
  const takers = (side: Side) =>
    [...onPitch[side]].sort((a, b) => Number(a.line === "G") - Number(b.line === "G") || goalsOf(side, b) - goalsOf(side, a) || SCORING[b.line] - SCORING[a.line]);
  const order = { home: takers("home"), away: takers("away") };
  let last: SimShootout | null = null;
  for (let tries = 0; tries < 400; tries++) {
    const kicks: ShootoutKick[] = [];
    const score = { home: 0, away: 0 };
    const taken = { home: 0, away: 0 };
    for (let round = 0; round < 30; round++) {
      for (const side of SIDES) {
        const player = order[side][taken[side] % Math.max(1, order[side].length)];
        if (!player) continue;
        const scored = rng() < 0.76;
        taken[side] += 1;
        if (scored) score[side] += 1;
        kicks.push({ side, player, scored });
        // Pendant les cinq premiers tirs, la séance s'arrête dès qu'une équipe ne peut plus revenir.
        if (round < 5) {
          const left = { home: 5 - taken.home, away: 5 - taken.away };
          if (score.home + left.home < score.away || score.away + left.away < score.home) break;
        }
      }
      const decided =
        round < 5
          ? score.home + (5 - taken.home) < score.away || score.away + (5 - taken.away) < score.home
          : taken.home === taken.away && score.home !== score.away;
      if (decided) break;
    }
    const result: Side = score.home > score.away ? "home" : "away";
    last = { kicks, score, winner: result };
    if (result === winner && score.home !== score.away) return last;
  }
  return last ?? { kicks: [], score: { home: 0, away: 0 }, winner };
}

/** Statistiques de fin de match, cohérentes avec les événements (tirs cadrés ≥ buts, fautes ≥ cartons…). */
function matchStats(rng: Rng, settings: SimSettings, events: SimEvent[], score: PerSide, extraTime: boolean): Record<Side, SimTeamStats> {
  const homeShare =
    settings.possession ?? Math.max(30, Math.min(70, Math.round(52 + (score.home - score.away) * 2 + (rng() - 0.5) * 16)));
  const length = extraTime ? 120 / 90 : 1;
  const result = {} as Record<Side, SimTeamStats>;
  for (const side of SIDES) {
    const share = (side === "home" ? homeShare : 100 - homeShare) / 100;
    const mine = events.filter((event) => event.side === side);
    const goals = mine.filter((event) => event.kind === "goal" && !event.ownGoal).length;
    const savedPenalties = mine.filter((event) => event.kind === "penaltyMiss" && event.saved).length;
    const missedPenalties = mine.filter((event) => event.kind === "penaltyMiss" && !event.saved).length;
    const varGoals = mine.filter((event) => event.kind === "varGoal");
    const cards = mine.filter((event) => event.kind === "yellow" || event.kind === "red").length;
    const onTarget = goals + savedPenalties + varGoals.length + Math.round((1 + rng() * 3 + share * 4) * length);
    result[side] = {
      possession: Math.round(share * 100),
      onTarget,
      shots: onTarget + missedPenalties + Math.round((2 + rng() * 4 + share * 8) * length),
      corners: Math.round((1 + rng() * 3 + share * 7) * length),
      fouls: cards + Math.round((6 + rng() * 6 + (1 - share) * 4) * length),
      offsides: varGoals.filter((event) => event.reason.startsWith("hors-jeu")).length + Math.round(rng() * 3 * length),
    };
  }
  return result;
}

/** Minimum de chaque statistique déjà justifié par les événements joués (pour l'affichage en direct). */
export function statsFloor(events: SimEvent[], side: Side): Omit<SimTeamStats, "possession"> {
  const mine = events.filter((event) => event.side === side);
  const goals = mine.filter((event) => event.kind === "goal" && !event.ownGoal).length;
  const saved = mine.filter((event) => event.kind === "penaltyMiss" && event.saved).length;
  const missed = mine.filter((event) => event.kind === "penaltyMiss" && !event.saved).length;
  const varGoals = mine.filter((event) => event.kind === "varGoal");
  const onTarget = goals + saved + varGoals.length;
  return {
    onTarget,
    shots: onTarget + missed,
    corners: 0,
    fouls: mine.filter((event) => event.kind === "yellow" || event.kind === "red").length,
    offsides: varGoals.filter((event) => event.reason.startsWith("hors-jeu")).length,
  };
}
