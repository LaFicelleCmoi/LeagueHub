import type { SquadLine, SquadPlayer } from "./types";

// Moteur du simulateur de match : à partir des réglages (buts, cartons) et des effectifs réels,
// il compose les deux onze de départ et déroule la chronologie du match. Tout est tiré d'une graine :
// mêmes réglages et même graine donnent exactement le même match, ce qui permet de le partager par lien.

export type Side = "home" | "away";
export const SIDES: readonly Side[] = ["home", "away"];

export interface SimSettings {
  goals: Record<Side, number>;
  /** Cartons jaunes montrés, second jaune compris. */
  yellows: Record<Side, number>;
  /** Expulsions : rouge direct ou second jaune. */
  reds: Record<Side, number>;
}

export type SimStat = keyof SimSettings;

export const SIM_LIMITS: Record<SimStat, number> = { goals: 9, yellows: 8, reds: 3 };

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
  half: 1 | 2;
  minute: number;
  extra: number;
  /** Minutes de jeu écoulées depuis le début de la période : sert à l'ordre et au déroulé. */
  at: number;
}

export type SimEvent = { side: Side; time: SimTime } & (
  | { kind: "goal"; scorer: SimPlayer; assist: SimPlayer | null; ownGoal: boolean; penalty: boolean }
  | { kind: "yellow"; player: SimPlayer }
  | { kind: "red"; player: SimPlayer; secondYellow: boolean }
  | { kind: "sub"; on: SimPlayer; off: SimPlayer }
);

export interface SimLineup {
  starters: SimPlayer[];
  bench: SimPlayer[];
}

export interface SimMatch {
  lineups: Record<Side, SimLineup>;
  /** Dans l'ordre du match. */
  events: SimEvent[];
  /** Temps additionnel de chaque période, en minutes. */
  addedTime: Record<1 | 2, number>;
  score: Record<Side, number>;
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

function pickWeighted<T>(rng: Rng, items: readonly T[], weight: (item: T) => number): T | undefined {
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

// --- Réglages tirés au hasard ---

// Moyennes par équipe : buts selon l'ouverture du match, cartons selon la sévérité de l'arbitre.
const GOAL_MEANS = [0.75, 1.35, 2.2];
const YELLOW_MEANS = [1.1, 2.1, 3.4];
const RED_MEANS = [0.03, 0.1, 0.32];
const HOME_ADVANTAGE: Record<Side, number> = { home: 1.15, away: 0.9 };

export function randomStat(rng: Rng, stat: SimStat, side: Side, intensity: Intensity): number {
  const mean =
    stat === "goals" ? GOAL_MEANS[intensity] * HOME_ADVANTAGE[side] : stat === "yellows" ? YELLOW_MEANS[intensity] : RED_MEANS[intensity];
  return Math.min(SIM_LIMITS[stat], poisson(rng, mean));
}

export function randomSettings(rng: Rng, goals: Intensity, cards: Intensity): SimSettings {
  const row = (stat: SimStat, intensity: Intensity) => ({
    home: randomStat(rng, stat, "home", intensity),
    away: randomStat(rng, stat, "away", intensity),
  });
  return { goals: row("goals", goals), yellows: row("yellows", cards), reds: row("reds", cards) };
}

// --- Compositions ---

const FORMATION: Record<SquadLine, number> = { G: 1, D: 4, M: 3, F: 3 };
const BENCH_SIZE = 7;

function toSimPlayer(player: SquadPlayer): SimPlayer {
  return { id: player.id, name: player.name, shortName: player.shortName, jersey: player.jersey, line: player.line };
}

/** Effectif de secours quand ESPN ne répond pas : des joueurs sans nom, numérotés. */
function genericSquad(): SquadPlayer[] {
  const lines: SquadLine[] = ["G", "D", "D", "D", "D", "M", "M", "M", "F", "F", "F", "G", "D", "D", "M", "M", "F", "F"];
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

/** Onze type en 4-3-3 d'après le temps de jeu de la saison, puis 7 remplaçants. */
function buildLineup(rng: Rng, squad: SquadPlayer[]): { lineup: SimLineup; stats: Map<string, SquadPlayer> } {
  const pool = squad.length >= 11 ? squad : genericSquad();
  // Petit bruit pour départager les joueurs à égalité (début de saison, effectif peu utilisé).
  const ranked = pool
    .map((player) => ({ player, rank: player.appearances + rng() * 0.9 }))
    .sort((a, b) => b.rank - a.rank)
    .map((item) => item.player);

  const starters: SquadPlayer[] = [];
  for (const line of ["G", "D", "M", "F"] as const) {
    starters.push(...ranked.filter((player) => player.line === line).slice(0, FORMATION[line]));
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

/** Instant tiré dans une période, avec une densité qui croît au fil des minutes (`slope`). */
function randomTime(rng: Rng, addedTime: Record<1 | 2, number>, slope: number, secondHalfShare = 0.55, minAt = 0): SimTime {
  const half: 1 | 2 = rng() < secondHalfShare ? 2 : 1;
  const length = 45 + addedTime[half];
  let at = 0;
  // Tirage par rejet : la densité 1 + slope × t/length favorise les fins de période.
  for (let tries = 0; tries < 50; tries++) {
    at = minAt + rng() * (length - minAt);
    if (rng() * (1 + slope) < 1 + (slope * at) / length) break;
  }
  return timeAt(half, at);
}

function timeAt(half: 1 | 2, at: number): SimTime {
  const elapsed = Math.floor(at);
  const minute = elapsed < 45 ? (half - 1) * 45 + elapsed + 1 : half * 45;
  const extra = elapsed < 45 ? 0 : elapsed - 44;
  return { half, minute, extra, at: elapsed + 0.5 };
}

function compareTime(a: SimTime, b: SimTime): number {
  return a.half - b.half || a.at - b.at;
}

/** Libellé d'une minute : « 34' », « 45+2' ». */
export function formatSimMinute(time: Pick<SimTime, "minute" | "extra">): string {
  return time.extra > 0 ? `${time.minute}+${time.extra}'` : `${time.minute}'`;
}

type Slot = { side: Side; time: SimTime } & (
  | { kind: "goal" }
  | { kind: "yellow"; pair: number | null }
  | { kind: "red"; pair: number | null }
  | { kind: "sub" }
);

const SCORING: Record<SquadLine, number> = { G: 0.02, D: 0.8, M: 2.2, F: 5 };
const ASSISTING: Record<SquadLine, number> = { G: 0.05, D: 1, M: 3, F: 2 };
const BOOKING: Record<SquadLine, number> = { G: 0.15, D: 1.2, M: 1, F: 0.7 };

export function simulateMatch(settings: SimSettings, squads: Record<Side, SquadPlayer[]>, seed: number): SimMatch {
  const rng = createRng(seed);
  const built = { home: buildLineup(rng, squads.home), away: buildLineup(rng, squads.away) };
  const statsOf = (side: Side, player: SimPlayer) => built[side].stats.get(player.id);
  const addedTime = { 1: intBetween(rng, 1, 4), 2: intBetween(rng, 2, 6) } as Record<1 | 2, number>;

  // 1. Les instants de chaque événement, avant de savoir qui en est l'auteur.
  const slots: Slot[] = [];
  let pairs = 0;
  for (const side of SIDES) {
    for (let index = 0; index < settings.goals[side]; index++) {
      slots.push({ side, kind: "goal", time: randomTime(rng, addedTime, 0.6) });
    }
    // Un second jaune réclame un premier jaune plus tôt, au même joueur : il consomme deux jaunes.
    const reds = settings.reds[side];
    let secondYellows = 0;
    for (let index = 0; index < reds; index++) {
      if (settings.yellows[side] - 2 * (secondYellows + 1) >= 0 && rng() < 0.5) secondYellows += 1;
    }
    for (let index = 0; index < reds; index++) {
      const second = index < secondYellows;
      const time = randomTime(rng, addedTime, 1.2, 0.7, second ? 8 : 0);
      if (second) {
        const pair = pairs++;
        // Le premier jaune précède l'expulsion : en première période, ou plus tôt dans la même.
        const first = time.half === 2 && rng() < 0.5 ? timeAt(1, rng() * 45) : timeAt(time.half, rng() * (time.at - 1));
        slots.push({ side, kind: "yellow", pair, time: first });
        slots.push({ side, kind: "red", pair, time });
      } else {
        slots.push({ side, kind: "red", pair: null, time });
      }
    }
    for (let index = 0; index < settings.yellows[side] - 2 * secondYellows; index++) {
      slots.push({ side, kind: "yellow", pair: null, time: randomTime(rng, addedTime, 0.9, 0.6) });
    }
    // Trois changements en seconde période, s'il y a des remplaçants de champ.
    const outfieldBench = built[side].lineup.bench.filter((player) => player.line !== "G").length;
    for (let index = 0; index < Math.min(3, outfieldBench); index++) {
      slots.push({ side, kind: "sub", time: timeAt(2, intBetween(rng, 10, 40) + rng()) });
    }
  }
  slots.sort((a, b) => compareTime(a.time, b.time));

  // 2. Les auteurs, dans l'ordre du match : un joueur remplacé ou expulsé ne revient pas.
  const onPitch = { home: [...built.home.lineup.starters], away: [...built.away.lineup.starters] };
  const bench = { home: [...built.home.lineup.bench], away: [...built.away.lineup.bench] };
  const booked = new Set<string>();
  const pairPlayer = new Map<number, SimPlayer>();
  const events: SimEvent[] = [];
  const leave = (side: Side, player: SimPlayer) => {
    onPitch[side] = onPitch[side].filter((item) => item.id !== player.id);
  };
  const other = (side: Side): Side => (side === "home" ? "away" : "home");
  // Joueurs déjà avertis qui doivent prendre leur second jaune plus tard : ni remplacés ni expulsés avant.
  const awaitingSecondYellow = (time: SimTime) => {
    const ids = new Set<string>();
    for (const item of slots) {
      if (item.kind !== "red" || item.pair === null || compareTime(item.time, time) <= 0) continue;
      const player = pairPlayer.get(item.pair);
      if (player) ids.add(player.id);
    }
    return ids;
  };

  for (const slot of slots) {
    const { side, time } = slot;
    const players = onPitch[side];
    if (slot.kind === "goal") {
      const ownGoal = rng() < 0.04 && onPitch[other(side)].length > 0;
      const penalty = !ownGoal && rng() < 0.1;
      if (ownGoal) {
        const scorer = pickWeighted(rng, onPitch[other(side)], (player) => (player.line === "D" ? 3 : player.line === "G" ? 0.5 : 1));
        if (scorer) events.push({ kind: "goal", side, time, scorer, assist: null, ownGoal, penalty });
        continue;
      }
      const goals = (player: SimPlayer) => statsOf(side, player)?.goals ?? 0;
      // Penalty : le meilleur buteur présent le tire.
      const scorer = penalty
        ? [...players].sort((a, b) => goals(b) - goals(a) || SCORING[b.line] - SCORING[a.line])[0]
        : pickWeighted(rng, players, (player) => SCORING[player.line] + goals(player) * 1.3);
      if (!scorer) continue;
      const assist =
        penalty || rng() > 0.72
          ? null
          : (pickWeighted(
              rng,
              players.filter((player) => player.id !== scorer.id),
              (player) => ASSISTING[player.line] + (statsOf(side, player)?.assists ?? 0) * 1.2,
            ) ?? null);
      events.push({ kind: "goal", side, time, scorer, assist, ownGoal, penalty });
    } else if (slot.kind === "yellow" || slot.kind === "red") {
      const paired = slot.pair !== null ? pairPlayer.get(slot.pair) : undefined;
      const bookingWeight = (player: SimPlayer) => {
        const stats = statsOf(side, player);
        return BOOKING[player.line] * (1 + (stats?.fouls ?? 0) * 0.15 + (stats?.yellowCards ?? 0) * 0.8);
      };
      // Un jaune « simple » ne tombe pas sur un joueur déjà averti : ce serait une expulsion non prévue.
      const awaiting = awaitingSecondYellow(time);
      const candidates = players.filter((player) =>
        slot.kind === "yellow" ? !booked.has(player.id) : !awaiting.has(player.id),
      );
      const player = paired ?? pickWeighted(rng, candidates.length > 0 ? candidates : players, bookingWeight);
      if (!player) continue;
      if (slot.kind === "yellow") {
        booked.add(player.id);
        if (slot.pair !== null) pairPlayer.set(slot.pair, player);
        events.push({ kind: "yellow", side, time, player });
      } else {
        leave(side, player);
        events.push({ kind: "red", side, time, player, secondYellow: paired !== undefined });
      }
    } else {
      // Sort en priorité un joueur averti, jamais celui qui doit encore prendre son second jaune.
      const awaiting = awaitingSecondYellow(time);
      const off = pickWeighted(
        rng,
        players.filter((player) => player.line !== "G" && !awaiting.has(player.id)),
        (player) => (booked.has(player.id) ? 3 : 1) * (player.line === "F" ? 1.4 : 1),
      );
      const sameLine = bench[side].filter((player) => off && player.line === off.line);
      const on = sameLine[0] ?? bench[side].find((player) => player.line !== "G");
      if (!off || !on) continue;
      leave(side, off);
      onPitch[side].push(on);
      bench[side] = bench[side].filter((player) => player.id !== on.id);
      events.push({ kind: "sub", side, time, on, off });
    }
  }

  const score = { home: 0, away: 0 };
  for (const event of events) if (event.kind === "goal") score[event.side] += 1;

  return {
    lineups: { home: built.home.lineup, away: built.away.lineup },
    events,
    addedTime,
    score,
  };
}
