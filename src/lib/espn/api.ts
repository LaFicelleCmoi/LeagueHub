import "server-only";

import { espnDate, formatTime } from "@/lib/format";
import type { League } from "@/lib/leagues";
import type {
  Article,
  Leader,
  Leaders,
  Match,
  MatchEvent,
  MatchSide,
  StandingRow,
  Standings,
  Team,
  Zone,
} from "@/lib/types";
import { espnFetch } from "./client";
import type {
  EspnCompetitor,
  EspnDetail,
  EspnEvent,
  EspnNewsResponse,
  EspnScoreboardResponse,
  EspnStandingsResponse,
  EspnStat,
  EspnStatisticsResponse,
  EspnStatus,
  EspnTeam,
} from "./types";

// Durée de cache (secondes) adaptée au rythme de mise à jour de chaque donnée.
const REVALIDATE = {
  matches: 60,
  standings: 300,
  leaders: 900,
  news: 900,
} as const;

const soccer = (league: League, resource: string) => `/site/v2/sports/soccer/${league.espnCode}/${resource}`;

// --- Utilitaires ---

function toTeam(team: EspnTeam): Team {
  const logo =
    team.logo ?? team.logos?.find((l) => l.rel?.includes("default"))?.href ?? team.logos?.[0]?.href ?? null;
  return {
    id: team.id,
    name: team.displayName,
    shortName: team.shortDisplayName ?? team.displayName,
    abbreviation: team.abbreviation ?? team.displayName.slice(0, 3).toUpperCase(),
    logo,
  };
}

function statValue(stats: EspnStat[] | undefined, name: string): number | null {
  const stat = stats?.find((s) => s.name === name);
  if (!stat) return null;
  if (typeof stat.value === "number") return stat.value;
  const parsed = Number.parseFloat(stat.displayValue);
  return Number.isFinite(parsed) ? parsed : null;
}

// --- Classement ---

function toZone(description: string | undefined): Zone | null {
  const text = description?.toLowerCase();
  if (!description || !text) return null;

  const qualifying = text.includes("qualifying");
  const suffix = qualifying ? " (qualif.)" : "";

  if (text.includes("champions league")) return { label: `Ligue des champions${suffix}`, tone: "ucl", qualifying };
  if (text.includes("europa league")) return { label: `Ligue Europa${suffix}`, tone: "uel", qualifying };
  if (text.includes("conference league")) return { label: `Ligue Conférence${suffix}`, tone: "uecl", qualifying };
  if (/relegation play-?off/.test(text)) return { label: "Barrage de relégation", tone: "playoff", qualifying };
  if (text.includes("relegat")) return { label: "Relégation", tone: "relegation", qualifying };
  return { label: description, tone: "other", qualifying };
}

export async function getStandings(league: League): Promise<Standings> {
  const data = await espnFetch<EspnStandingsResponse>(`/v2/sports/soccer/${league.espnCode}/standings`, {
    revalidate: REVALIDATE.standings,
  });

  const table = data.children?.[0]?.standings;
  const rows = (table?.entries ?? [])
    .map((entry): StandingRow => {
      const stat = (name: string) => statValue(entry.stats, name) ?? 0;
      return {
        rank: stat("rank"),
        rankChange: stat("rankChange"),
        team: toTeam(entry.team),
        played: stat("gamesPlayed"),
        wins: stat("wins"),
        draws: stat("ties"),
        losses: stat("losses"),
        goalsFor: stat("pointsFor"),
        goalsAgainst: stat("pointsAgainst"),
        goalDiff: stat("pointDifferential"),
        points: stat("points"),
        zone: toZone(entry.note?.description),
      };
    })
    .sort((a, b) => a.rank - b.rank);

  return {
    season: table?.seasonDisplayName?.match(/\d{4}-\d{2}/)?.[0] ?? "",
    rows,
  };
}

// --- Matchs ---

const STATUS_LABELS: Record<string, string> = {
  STATUS_HALFTIME: "Mi-temps",
  STATUS_FULL_TIME: "Terminé",
  STATUS_FINAL: "Terminé",
  STATUS_FINAL_AET: "Terminé (a.p.)",
  STATUS_FINAL_PEN: "Terminé (t.a.b.)",
  STATUS_POSTPONED: "Reporté",
  STATUS_CANCELED: "Annulé",
  STATUS_ABANDONED: "Arrêté",
  STATUS_SUSPENDED: "Suspendu",
  STATUS_DELAYED: "Retardé",
};

const STATUSES_WITHOUT_SCORE = new Set(["STATUS_POSTPONED", "STATUS_CANCELED"]);

function statusLabel(status: EspnStatus, date: string): string {
  const label = STATUS_LABELS[status.type.name];
  if (label) return label;
  if (status.type.state === "pre") return formatTime(date);
  if (status.type.state === "in") return status.displayClock ?? status.type.shortDetail;
  return "Terminé";
}

function toMatchEvent(detail: EspnDetail, homeTeamId: string): MatchEvent | null {
  const athlete = detail.athletesInvolved?.[0];
  if (!athlete || detail.shootout) return null;

  let kind: MatchEvent["kind"];
  if (detail.redCard) kind = "red-card";
  else if (!detail.scoringPlay) return null;
  else if (detail.ownGoal) kind = "own-goal";
  else if (detail.penaltyKick) kind = "penalty";
  else kind = "goal";

  return {
    minute: detail.clock?.displayValue ?? "",
    player: athlete.shortName ?? athlete.displayName,
    kind,
    side: detail.team?.id === homeTeamId ? "home" : "away",
  };
}

function toMatch(event: EspnEvent): Match | null {
  const competition = event.competitions[0];
  const home = competition?.competitors.find((c) => c.homeAway === "home");
  const away = competition?.competitors.find((c) => c.homeAway === "away");
  if (!competition || !home || !away) return null;

  const status = competition.status ?? event.status;
  const showScore = status.type.state !== "pre" && !STATUSES_WITHOUT_SCORE.has(status.type.name);
  const side = (competitor: EspnCompetitor): MatchSide => ({
    team: toTeam(competitor.team),
    score: showScore ? Number(competitor.score ?? 0) : null,
    winner: competitor.winner === true,
  });

  return {
    id: event.id,
    date: event.date,
    state: status.type.state,
    status: statusLabel(status, event.date),
    venue: competition.venue?.fullName ?? null,
    home: side(home),
    away: side(away),
    events: (competition.details ?? [])
      .map((detail) => toMatchEvent(detail, home.team.id))
      .filter((e): e is MatchEvent => e !== null),
  };
}

/** Matchs joués ou programmés entre deux dates (incluses), triés chronologiquement. */
export async function getMatches(league: League, from: Date, to: Date = from): Promise<Match[]> {
  const start = espnDate(from);
  const end = espnDate(to);
  const data = await espnFetch<EspnScoreboardResponse>(soccer(league, "scoreboard"), {
    revalidate: REVALIDATE.matches,
    params: { dates: start === end ? start : `${start}-${end}`, limit: 200 },
  });

  return (data.events ?? [])
    .map(toMatch)
    .filter((m): m is Match => m !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// --- Buteurs et passeurs ---

export async function getLeaders(league: League, limit = 20): Promise<Leaders> {
  const data = await espnFetch<EspnStatisticsResponse>(soccer(league, "statistics"), {
    revalidate: REVALIDATE.leaders,
  });

  const pick = (category: string): Leader[] => {
    const leaders = data.stats?.find((s) => s.name === category)?.leaders ?? [];
    const result: Leader[] = [];
    for (const leader of leaders.filter((l) => l.value > 0).slice(0, limit)) {
      const previous = result.at(-1);
      result.push({
        id: leader.athlete.id,
        // Classement « sportif » : les ex æquo partagent le même rang.
        rank: previous && previous.value === leader.value ? previous.rank : result.length + 1,
        player: leader.athlete.displayName,
        team: leader.athlete.team ? toTeam(leader.athlete.team) : null,
        value: leader.value,
        appearances: statValue(leader.athlete.statistics, "appearances"),
      });
    }
    return result;
  };

  return { goals: pick("goalsLeaders"), assists: pick("assistsLeaders") };
}

// --- Actualités ---

export async function getNews(league: League, limit = 12): Promise<Article[]> {
  const data = await espnFetch<EspnNewsResponse>(soccer(league, "news"), {
    revalidate: REVALIDATE.news,
    params: { limit },
  });

  return (data.articles ?? []).map((article, index) => {
    const image = article.images?.find((img) => img.type === "header") ?? article.images?.[0];
    return {
      id: String(article.id ?? index),
      headline: article.headline,
      description: article.description ?? "",
      published: article.published,
      image: image?.url ?? null,
      url: article.links?.web?.href ?? null,
    };
  });
}
