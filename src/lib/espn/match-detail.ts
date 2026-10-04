import "server-only";

import type {
  FormGame,
  HeadToHead,
  Lineup,
  LineupPlayer,
  MatchDetail,
  MatchOutcome,
  MatchStat,
  Team,
  TeamFormLine,
  TimelineEvent,
  TimelineKind,
} from "@/lib/types";
import { toMatch, withUndecidedTeams } from "./api";
import { espnFetch } from "./client";
import type { EspnEvent, EspnKeyEvent, EspnRosterPlayer, EspnSeriesGame, EspnStat, EspnSummaryResponse } from "./types";

// Détail d'un match lu chez ESPN (/summary) et traduit en français : chronologie complète,
// statistiques, compositions, arbitres, stade, affluence, diffuseurs et commentaire.

/** Pendant le direct, le détail change à chaque action : copie en mémoire de 15 s seulement. */
const DETAIL_TTL = 15_000;

// --- Chronologie ---

const EVENT_LABELS: Record<string, string> = {
  goal: "But",
  "goal---header": "But de la tête",
  "goal---free-kick": "But sur coup franc",
  "goal---volley": "But de volée",
  "penalty---scored": "Penalty transformé",
  "penalty---missed": "Penalty manqué",
  "penalty---saved": "Penalty arrêté",
  "own-goal": "But contre son camp",
  "yellow-card": "Carton jaune",
  "red-card": "Carton rouge",
  substitution: "Remplacement",
  kickoff: "Coup d’envoi",
  halftime: "Mi-temps",
  "start-2nd-half": "Reprise de la seconde période",
  "end-regular-time": "Fin du temps réglementaire",
  "start-extra-time": "Début des prolongations",
  "end-extra-time": "Fin des prolongations",
  "start-shootout": "Début de la séance de tirs au but",
  "end-shootout": "Fin de la séance de tirs au but",
  "full-time": "Fin du match",
  "start-delay": "Arrêt de jeu",
  "end-delay": "Reprise du jeu",
};

function eventKind(slug: string): TimelineKind {
  if (slug === "penalty---scored") return "penalty-goal";
  if (slug === "penalty---missed") return "penalty-missed";
  if (slug === "penalty---saved") return "penalty-saved";
  if (slug === "own-goal") return "own-goal";
  if (slug.startsWith("goal")) return "goal";
  if (slug.includes("yellow") && slug.includes("red")) return "second-yellow";
  if (slug.startsWith("yellow")) return "yellow-card";
  if (slug.startsWith("red")) return "red-card";
  if (slug === "substitution") return "substitution";
  if (/(^|-)var(-|$)/.test(slug)) return "var";
  if (slug.endsWith("-delay")) return "delay";
  if (["kickoff", "halftime", "full-time"].includes(slug) || /^(start|end)-/.test(slug)) return "period";
  return "other";
}

const CARD_REASONS: [RegExp, string][] = [
  [/second yellow/i, "second avertissement"],
  [/violent conduct/i, "comportement violent"],
  [/serious foul play/i, "faute grave"],
  [/professional foul|denying .*goal/i, "occasion de but anéantie"],
  [/dangerous play/i, "jeu dangereux"],
  [/hand ?ball/i, "main"],
  [/time ?wasting/i, "gain de temps"],
  [/dissent|argument/i, "contestation"],
  [/unsporting|unprofessional/i, "comportement antisportif"],
  [/simulation|diving/i, "simulation"],
  [/excessive celebration/i, "célébration excessive"],
  [/off the ball/i, "faute hors action"],
  [/bad foul|foul/i, "faute"],
];

const GOAL_KINDS = new Set<TimelineKind>(["goal", "penalty-goal", "own-goal"]);
const CARD_KINDS = new Set<TimelineKind>(["yellow-card", "second-yellow", "red-card"]);

function eventDetail(kind: TimelineKind, text: string): string | null {
  if (!text) return null;
  if (CARD_KINDS.has(kind)) {
    const reason = CARD_REASONS.find(([pattern]) => pattern.test(text));
    return reason ? `Motif : ${reason[1]}` : null;
  }
  if (kind === "substitution" || kind === "delay") return /injury/i.test(text) ? "Sur blessure" : null;
  if (GOAL_KINDS.has(kind) || kind === "penalty-missed" || kind === "penalty-saved") {
    const parts: string[] = [];
    if (/header/i.test(text)) parts.push("de la tête");
    else if (/right footed/i.test(text)) parts.push("du pied droit");
    else if (/left footed/i.test(text)) parts.push("du pied gauche");
    // « Goal! Barcelona 1, Racing de Santander 0. » : le score juste après le but.
    const score = text.match(/\s(\d+),\s[^,.]*?\s(\d+)\.(?:\s|$)/);
    if (score && GOAL_KINDS.has(kind)) parts.push(`score ${score[1]}-${score[2]}`);
    return parts.length ? parts.join(" · ").replace(/^./, (c) => c.toUpperCase()) : null;
  }
  // VAR et actions rares : le texte d'ESPN (en anglais) reste la meilleure description.
  return kind === "var" || kind === "other" ? text : null;
}

function toTimeline(events: EspnKeyEvent[], homeId: string, awayId: string): TimelineEvent[] {
  const seenDelays = new Set<string>();
  const timeline: TimelineEvent[] = [];
  for (const event of events) {
    const slug = event.type?.type ?? "";
    const kind = eventKind(slug);
    const minute = event.clock?.displayValue ?? "";
    // ESPN publie chaque arrêt de jeu une fois par équipe : on n'en garde qu'un.
    if (kind === "delay") {
      const key = `${slug}-${minute}`;
      if (seenDelays.has(key)) continue;
      seenDelays.add(key);
    }
    const teamId = event.team?.id;
    timeline.push({
      id: event.id,
      minute,
      kind,
      label:
        EVENT_LABELS[slug] ??
        (kind === "second-yellow" ? "Second carton jaune" : kind === "var" ? "Arbitrage vidéo (VAR)" : (event.type?.text ?? "Action")),
      side: kind === "period" ? null : teamId === homeId ? "home" : teamId === awayId ? "away" : null,
      players: (event.participants ?? [])
        .map((participant) => participant.athlete?.displayName)
        .filter((name): name is string => Boolean(name)),
      detail: eventDetail(kind, event.text ?? ""),
    });
  }
  return timeline;
}

// --- Statistiques ---

const STAT_LABELS: [string, string][] = [
  ["possessionPct", "Possession"],
  ["totalShots", "Tirs"],
  ["shotsOnTarget", "Tirs cadrés"],
  ["shotPct", "Précision des tirs"],
  ["blockedShots", "Tirs contrés"],
  ["wonCorners", "Corners"],
  ["offsides", "Hors-jeu"],
  ["foulsCommitted", "Fautes"],
  ["yellowCards", "Cartons jaunes"],
  ["redCards", "Cartons rouges"],
  ["saves", "Arrêts du gardien"],
  ["totalPasses", "Passes"],
  ["accuratePasses", "Passes réussies"],
  ["passPct", "Précision des passes"],
  ["totalCrosses", "Centres"],
  ["accurateCrosses", "Centres réussis"],
  ["crossPct", "Précision des centres"],
  ["totalLongBalls", "Longs ballons"],
  ["accurateLongBalls", "Longs ballons réussis"],
  ["longballPct", "Précision des longs ballons"],
  ["totalTackles", "Tacles"],
  ["effectiveTackles", "Tacles réussis"],
  ["tacklePct", "Réussite des tacles"],
  ["interceptions", "Interceptions"],
  ["totalClearance", "Dégagements"],
  ["effectiveClearance", "Dégagements réussis"],
  ["penaltyKickShots", "Penaltys tentés"],
  ["penaltyKickGoals", "Penaltys marqués"],
];

/** ESPN arrondit ses pourcentages au dixième (« 0.3 ») : on les recalcule à partir des totaux. */
const RATIOS: Record<string, [string, string]> = {
  shotPct: ["shotsOnTarget", "totalShots"],
  passPct: ["accuratePasses", "totalPasses"],
  crossPct: ["accurateCrosses", "totalCrosses"],
  longballPct: ["accurateLongBalls", "totalLongBalls"],
  tacklePct: ["effectiveTackles", "totalTackles"],
};

const percent = (value: number) => `${Math.round(value)} %`;

function toStats(home: (EspnStat & { label?: string })[], away: (EspnStat & { label?: string })[]): MatchStat[] {
  const values = (stats: EspnStat[]) =>
    new Map(stats.map((stat) => [stat.name, Number.parseFloat(stat.displayValue)] as const));
  const homeValues = values(home);
  const awayValues = values(away);
  const labels = new Map(STAT_LABELS);
  // Statistiques inconnues du site : affichées à la suite, avec le libellé d'ESPN.
  for (const stat of [...home, ...away]) {
    if (!labels.has(stat.name)) labels.set(stat.name, stat.label ?? stat.name);
  }

  const result: MatchStat[] = [];
  for (const [key, label] of labels) {
    if (!homeValues.has(key) && !awayValues.has(key)) continue;

    let homeValue = homeValues.get(key) ?? Number.NaN;
    let awayValue = awayValues.get(key) ?? Number.NaN;
    let format = (value: number) => (Number.isNaN(value) ? "—" : String(Math.round(value)));

    if (key === "possessionPct") {
      format = (value) => (Number.isNaN(value) ? "—" : percent(value));
    } else if (RATIOS[key]) {
      const [part, total] = RATIOS[key];
      const ratio = (values: Map<string, number>, fallback: number) => {
        const denominator = values.get(total);
        if (denominator === undefined || Number.isNaN(denominator)) return fallback * 100;
        return denominator === 0 ? Number.NaN : ((values.get(part) ?? 0) / denominator) * 100;
      };
      homeValue = ratio(homeValues, homeValue);
      awayValue = ratio(awayValues, awayValue);
      format = (value) => (Number.isNaN(value) ? "—" : percent(value));
    }

    const both = !Number.isNaN(homeValue) && !Number.isNaN(awayValue);
    result.push({
      key,
      label,
      home: format(homeValue),
      away: format(awayValue),
      share: both && homeValue + awayValue > 0 ? homeValue / (homeValue + awayValue) : null,
    });
  }
  return result;
}

// --- Compositions ---

function toPlayer(player: EspnRosterPlayer): LineupPlayer {
  const stat = (name: string) => Number(player.stats?.find((item) => item.name === name)?.displayValue ?? 0) || 0;
  const substitutions = (player.plays ?? []).filter((play) => play.substitution);
  return {
    id: player.athlete.id,
    name: player.athlete.displayName,
    jersey: player.jersey ?? null,
    position: player.position?.abbreviation ?? null,
    starter: player.starter === true,
    subbedIn: player.subbedIn ? (substitutions[0]?.clock?.displayValue ?? "") : null,
    subbedOut: player.subbedOut ? (substitutions.at(-1)?.clock?.displayValue ?? "") : null,
    goals: stat("totalGoals"),
    assists: stat("goalAssists"),
    yellowCards: stat("yellowCards"),
    redCards: stat("redCards"),
  };
}

const OFFICIAL_ROLES: [RegExp, string][] = [
  [/assistant var|avar/i, "Assistant vidéo"],
  [/video|var/i, "Arbitre vidéo"],
  [/fourth/i, "Quatrième arbitre"],
  [/assistant/i, "Arbitre assistant"],
  [/referee/i, "Arbitre"],
];

// --- Avant-match ---

const COMPETITION_SHORT: Record<string, string> = {
  UCL: "LDC",
  UEL: "Europa",
  UECL: "Conférence",
  LALIGA: "La Liga",
  EPL: "Premier League",
  "SERIE A": "Serie A",
  BUNDESLIGA: "Bundesliga",
  "LIGUE 1": "Ligue 1",
};

const RESULTS: Record<string, MatchOutcome> = { W: "win", D: "draw", L: "loss" };

function toFormLines(data: EspnSummaryResponse, sides: { home: Team; away: Team }): TeamFormLine[] {
  return (["home", "away"] as const).flatMap((side) => {
    const team = sides[side];
    const entry = data.lastFiveGames?.find((item) => item.team.id === team.id);
    if (!entry) return [];
    const games: FormGame[] = (entry.events ?? []).map((game) => {
      const home = game.homeTeamId === team.id;
      const homeScore = Number(game.homeTeamScore ?? 0) || 0;
      const awayScore = Number(game.awayTeamScore ?? 0) || 0;
      const abbreviation = (game.leagueAbbreviation ?? "").toUpperCase();
      return {
        id: game.id,
        date: game.gameDate,
        home,
        opponent: {
          name: game.opponent?.displayName ?? "Adversaire",
          abbreviation: game.opponent?.abbreviation ?? "",
          logo: game.opponentLogo ?? game.opponent?.logo ?? null,
        },
        goalsFor: home ? homeScore : awayScore,
        goalsAgainst: home ? awayScore : homeScore,
        outcome: RESULTS[game.gameResult ?? ""] ?? null,
        competition: COMPETITION_SHORT[abbreviation] ?? game.leagueAbbreviation ?? game.leagueName ?? "",
      };
    });
    games.sort((a, b) => b.date.localeCompare(a.date));
    return [{ side, team, games }];
  });
}

function toHeadToHead(data: EspnSummaryResponse, homeId: string, awayId: string): HeadToHead | null {
  const series = data.seasonseries?.find((item) => (item.events?.length ?? 0) > 0);
  const events: EspnSeriesGame[] = series?.events ?? [];
  if (events.length === 0) return null;

  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  const games = events
    .filter((game) => game.statusType?.completed !== false)
    .map((game) => {
      const home = game.competitors?.find((competitor) => competitor.homeAway === "home");
      const away = game.competitors?.find((competitor) => competitor.homeAway === "away");
      const homeScore = home?.score !== undefined ? Number(home.score) : null;
      const awayScore = away?.score !== undefined ? Number(away.score) : null;
      const winner = home?.winner ? "home" : away?.winner ? "away" : null;
      const winnerId = winner === "home" ? home?.team.id : winner === "away" ? away?.team.id : null;
      if (winnerId === homeId) homeWins += 1;
      else if (winnerId === awayId) awayWins += 1;
      else draws += 1;
      return {
        id: game.id,
        date: game.date,
        competition: game.competitionName ?? "",
        home: { name: home?.team.displayName ?? "", logo: home?.team.logo ?? home?.team.logos?.[0]?.href ?? null },
        away: { name: away?.team.displayName ?? "", logo: away?.team.logo ?? away?.team.logos?.[0]?.href ?? null },
        homeScore: Number.isFinite(homeScore) ? homeScore : null,
        awayScore: Number.isFinite(awayScore) ? awayScore : null,
        winner: winner as "home" | "away" | null,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return games.length > 0 ? { games, wins: { home: homeWins, away: awayWins }, draws } : null;
}

// --- Détail complet ---

/** Détail d'un match ; `competition` est le code ESPN (« esp.1 »). */
export async function getMatchDetail(competition: string, eventId: string): Promise<MatchDetail | null> {
  const data = await espnFetch<EspnSummaryResponse>(`/site/v2/sports/soccer/${competition}/summary`, {
    memoryTtl: DETAIL_TTL,
    params: { event: eventId },
  });

  const header = data.header?.competitions?.[0];
  if (!header) return null;
  const event: EspnEvent = {
    id: eventId,
    date: header.date,
    name: "",
    status: header.status,
    competitions: [{ ...header, venue: data.gameInfo?.venue ?? header.venue }],
  };
  const parsed = toMatch(event, competition);
  if (!parsed) return null;
  const match = withUndecidedTeams(parsed);
  const homeId = match.home.team.id;
  const awayId = match.away.team.id;

  const boxscore = (side: "home" | "away") =>
    data.boxscore?.teams?.find((team) => (team.homeAway ?? (team.team.id === homeId ? "home" : "away")) === side)
      ?.statistics ?? [];

  const lineups: Lineup[] = (["home", "away"] as const).flatMap((side) => {
    const roster = data.rosters?.find((item) => item.homeAway === side);
    if (!roster) return [];
    const players = (roster.roster ?? [])
      .map((player) => ({ player: toPlayer(player), place: Number(player.formationPlace ?? 99) }))
      .sort((a, b) => Number(b.player.starter) - Number(a.player.starter) || a.place - b.place)
      .map(({ player }) => player);
    return [{ side, team: match[side].team, formation: roster.formation ?? null, players }];
  });

  const venue = data.gameInfo?.venue;
  return {
    match,
    form: toFormLines(data, { home: match.home.team, away: match.away.team }),
    headToHead: toHeadToHead(data, homeId, awayId),
    timeline: toTimeline(data.keyEvents ?? [], homeId, awayId),
    stats: toStats(boxscore("home"), boxscore("away")),
    lineups,
    officials: (data.gameInfo?.officials ?? []).flatMap((official) => {
      const name = official.displayName ?? official.fullName;
      if (!name) return [];
      const position = official.position?.displayName ?? official.position?.name ?? "";
      const role = OFFICIAL_ROLES.find(([pattern]) => pattern.test(position))?.[1] ?? position;
      return [{ name, role }];
    }),
    venue: venue?.fullName ? { name: venue.fullName, city: venue.address?.city ?? null } : null,
    attendance: data.gameInfo?.attendance ? data.gameInfo.attendance : null,
    broadcasts: [
      ...new Set(
        (data.broadcasts ?? [])
          .map((broadcast) => broadcast.media?.shortName ?? broadcast.media?.name)
          .filter((name): name is string => Boolean(name)),
      ),
    ],
    commentary: (data.commentary ?? [])
      .filter((line) => line.text)
      .map((line) => ({ minute: line.time?.displayValue ?? "", text: line.text ?? "" }))
      .reverse(),
  };
}
