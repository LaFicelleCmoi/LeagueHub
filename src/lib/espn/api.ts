import "server-only";

import {
  calendarMatchesBetween,
  getCalendar,
  nextCalendarMatch,
  type CalendarMatch,
  type CalendarSlug,
  type CompetitionCalendar,
} from "@/lib/calendar";
import { buildRounds, CUP_CALENDARS } from "@/lib/cup-calendar";
import { frenchDateRange, legLabel, roundKey, roundLabel, type Cup } from "@/lib/cups";
import { addDays, dayKey, espnDate, formatTime } from "@/lib/format";
import { LEAGUES, type League } from "@/lib/leagues";
import type {
  Article,
  CupMatch,
  CupOverview,
  EuropeanCup,
  Leader,
  Leaders,
  Match,
  MatchEvent,
  MatchOutcome,
  MatchSide,
  StandingRow,
  Standings,
  Team,
  TeamFixture,
  TeamForm,
  TeamLiveMatch,
  TeamResult,
  TeamSeasonTotals,
  Zone,
} from "@/lib/types";
import { espnFetch } from "./client";
import type {
  EspnCalendarGroup,
  EspnCompetitor,
  EspnDetail,
  EspnEvent,
  EspnNewsResponse,
  EspnScheduleEvent,
  EspnScheduleResponse,
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
  previousSeason: 86_400,
  // Calendrier des tours d'une coupe.
  cupInfo: 3_600,
} as const;

// Données qui suivent le direct : copies en mémoire (millisecondes) plutôt que Data Cache de Next.js,
// qui renverrait encore l'ancienne version pendant sa mise à jour (voir espnFetch).
const MEMORY_TTL = {
  live: 5_000,
  team: 20_000,
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
  else if (detail.yellowCard) kind = "yellow-card";
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

/** Nombre de matchs du bilan « victoires-nuls-défaites » fourni avec chaque match. */
function recordGames(competitor: EspnCompetitor): number | null {
  const summary = competitor.records?.find((record) => record.type === "total")?.summary;
  const counts = summary?.split("-").map(Number) ?? [];
  return counts.length === 3 && counts.every(Number.isInteger) ? counts[0] + counts[1] + counts[2] : null;
}

export function toMatch(event: EspnEvent, competitionCode: string): Match | null {
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
    played: recordGames(competitor),
    shootout: showScore && typeof competitor.shootoutScore === "number" ? competitor.shootoutScore : null,
  });

  return {
    id: event.id,
    competition: competitionCode,
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

type CacheOptions = { revalidate: number } | { memoryTtl: number };

/** Mois au format ESPN (« 202609 ») couvrant une période. */
function espnMonths(from: Date, to: Date): string[] {
  const first = espnDate(from);
  const last = espnDate(to).slice(0, 6);
  const months: string[] = [];
  let year = Number(first.slice(0, 4));
  let month = Number(first.slice(4, 6));
  for (let key = first.slice(0, 6); key <= last; key = `${year}${String(month).padStart(2, "0")}`) {
    months.push(key);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

/**
 * Matchs d'un scoreboard ESPN entre deux dates (heure de Paris, incluses).
 * ESPN refuse régulièrement les plages de plusieurs jours (400 « Failed to get events endpoint »)
 * mais accepte toujours un jour seul ou un mois entier : au-delà d'un jour, on demande mois par mois
 * puis on garde les jours voulus.
 */
async function scoreboardEvents(path: string, from: Date, to: Date, cache: CacheOptions): Promise<EspnEvent[]> {
  const start = espnDate(from);
  const end = espnDate(to);
  if (start === end) {
    const data = await espnFetch<EspnScoreboardResponse>(path, { ...cache, params: { dates: start, limit: 500 } });
    return data.events ?? [];
  }
  // Un jour de marge de chaque côté : ESPN range les matchs par mois dans son propre fuseau horaire.
  const pages = await Promise.all(
    espnMonths(addDays(from, -1), addDays(to, 1)).map((month) =>
      espnFetch<EspnScoreboardResponse>(path, { ...cache, params: { dates: month, limit: 500 } }),
    ),
  );
  const events = new Map<string, EspnEvent>();
  for (const event of pages.flatMap((page) => page.events ?? [])) {
    const day = espnDate(new Date(event.date));
    if (day >= start && day <= end) events.set(event.id, event);
  }
  return [...events.values()];
}

/** Match du calendrier sans données ESPN : affiché avec sa date et son heure, sans score. */
function calendarMatch(fixture: CalendarMatch, calendar: CompetitionCalendar): Match {
  const side = (id: string): MatchSide => {
    const team = calendar.teams[id];
    return {
      team: {
        id,
        name: team?.name ?? "À déterminer",
        shortName: team?.shortName ?? team?.name ?? "À déterminer",
        abbreviation: team?.abbreviation ?? "?",
        logo: team?.logo ?? null,
      },
      score: null,
      winner: false,
      played: null,
      shootout: null,
    };
  };
  const kickoff = Date.parse(fixture.date);
  const now = Date.now();
  // Sans état connu, un match reste « à venir » quelques heures après son coup d'envoi (le direct
  // prend le relais), puis apparaît dans les résultats, sans score.
  const pending = kickoff > now - KICKOFF_GRACE;
  return {
    id: fixture.id,
    competition: calendar.espnCode,
    date: fixture.date,
    state: pending ? "pre" : "post",
    status: kickoff > now ? formatTime(fixture.date) : pending ? "Direct indisponible" : "Score indisponible",
    venue: fixture.venue,
    home: side(fixture.home),
    away: side(fixture.away),
    events: [],
  };
}

interface CompetitionItem {
  match: Match;
  event: EspnEvent | null;
  fixture: CalendarMatch | null;
}

/**
 * Matchs d'une compétition entre deux dates. La liste vient du calendrier stocké dans le site ;
 * ESPN n'apporte que l'état de chaque match (score, minute, événements). S'il ne répond pas,
 * les matchs s'affichent quand même, avec leur date et leur heure.
 */
async function competitionMatches(slug: CalendarSlug, from: Date, to: Date, cache: CacheOptions): Promise<CompetitionItem[]> {
  const calendar = getCalendar(slug);
  const events = await scoreboardEvents(`/site/v2/sports/soccer/${calendar.espnCode}/scoreboard`, from, to, cache).catch(
    () => [] as EspnEvent[],
  );
  const byId = new Map(events.map((event) => [event.id, event]));

  const items: CompetitionItem[] = calendarMatchesBetween(slug, from, to).map((fixture) => {
    const event = byId.get(fixture.id) ?? null;
    byId.delete(fixture.id);
    const match = (event && toMatch(event, calendar.espnCode)) ?? calendarMatch(fixture, calendar);
    return { match, event, fixture };
  });
  // Matchs ajoutés ou déplacés par ESPN depuis le dernier relevé du calendrier.
  for (const event of byId.values()) {
    const match = toMatch(event, calendar.espnCode);
    if (match) items.push({ match, event, fixture: null });
  }
  return items.sort((a, b) => a.match.date.localeCompare(b.match.date));
}

/** Matchs d'un championnat entre deux dates (incluses), triés chronologiquement. */
export async function getMatches(
  league: League,
  from: Date,
  to: Date = from,
  cache: CacheOptions = { revalidate: REVALIDATE.matches },
): Promise<Match[]> {
  return (await competitionMatches(league.slug, from, to, cache)).map((item) => item.match);
}

/**
 * Matchs d'hier et d'aujourd'hui (un match du soir peut finir après minuit), pour le suivi en direct.
 * ESPN seulement : s'il ne répond pas, le navigateur garde les derniers scores connus.
 */
export async function getLiveMatches(league: League): Promise<Match[]> {
  const now = new Date();
  const events = await scoreboardEvents(soccer(league, "scoreboard"), addDays(now, -1), now, { memoryTtl: MEMORY_TTL.live });
  return events
    .map((event) => toMatch(event, league.espnCode))
    .filter((match): match is Match => match !== null)
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

// --- Derniers résultats d'un club ---

// Compétitions officielles retenues, avec leur nom en français. Les championnats nationaux
// (« eng.1 », « eng.2 »…) sont aussi retenus ; amicaux et tournois de préparation sont ignorés.
const COMPETITION_LABELS: Record<string, string> = {
  ...Object.fromEntries(LEAGUES.map((league) => [league.espnCode, league.name])),
  "eng.2": "Championship",
  "eng.fa": "FA Cup",
  "eng.league_cup": "Carabao Cup",
  "eng.charity": "Community Shield",
  "esp.copa_del_rey": "Coupe du Roi",
  "esp.super_cup": "Supercoupe d'Espagne",
  "ita.coppa_italia": "Coupe d'Italie",
  "ita.super_cup": "Supercoupe d'Italie",
  "ger.dfb_pokal": "Coupe d'Allemagne",
  "ger.super_cup": "Supercoupe d'Allemagne",
  "fra.coupe_de_france": "Coupe de France",
  "fra.super_cup": "Trophée des champions",
  "uefa.champions": "Ligue des champions",
  "uefa.europa": "Ligue Europa",
  "uefa.europa.conf": "Ligue Conférence",
  "uefa.champions_qual": "Ligue des champions (qualif.)",
  "uefa.europa_qual": "Ligue Europa (qualif.)",
  "uefa.europa.conf_qual": "Ligue Conférence (qualif.)",
  "uefa.super_cup": "Supercoupe de l'UEFA",
  "fifa.cwc": "Coupe du monde des clubs",
  "fifa.intercontinental_cup": "Coupe intercontinentale",
};

const NATIONAL_LEAGUE = /^[a-z]{3}\.\d$/;

function isOfficial(slug: string): boolean {
  return Object.hasOwn(COMPETITION_LABELS, slug) || NATIONAL_LEAGUE.test(slug);
}

/** Compétition connue du site (championnats, coupes, coupes d'Europe) : garde-fou des routes internes. */
export function isKnownCompetition(code: string): boolean {
  return Object.hasOwn(COMPETITION_LABELS, code);
}

// Coupes d'Europe (tours de qualification compris), mises en avant dans l'interface.
const EUROPEAN_CUPS: Record<string, EuropeanCup> = {
  "uefa.champions": "ucl",
  "uefa.champions_qual": "ucl",
  "uefa.europa": "uel",
  "uefa.europa_qual": "uel",
  "uefa.europa.conf": "uecl",
  "uefa.europa.conf_qual": "uecl",
};

function europeanCup(slug: string): EuropeanCup | null {
  return Object.hasOwn(EUROPEAN_CUPS, slug) ? EUROPEAN_CUPS[slug] : null;
}

function toTeamResult(event: EspnScheduleEvent, teamId: string): TeamResult | null {
  const slug = event.league?.slug ?? "";
  // Seules les compétitions officielles comptent : les amicaux ne disent rien de la forme du moment.
  if (!isOfficial(slug)) return null;

  const competition = event.competitions[0];
  if (!competition?.status.type.completed) return null;
  const us = competition.competitors.find((c) => c.team.id === teamId);
  const them = competition.competitors.find((c) => c.team.id !== teamId);
  if (!us || !them) return null;

  const goalsFor = us.score?.value ?? Number(us.score?.displayValue ?? 0);
  const goalsAgainst = them.score?.value ?? Number(them.score?.displayValue ?? 0);

  let outcome: MatchOutcome;
  if (us.winner) outcome = "win";
  else if (them.winner) outcome = "loss";
  else outcome = goalsFor > goalsAgainst ? "win" : goalsFor < goalsAgainst ? "loss" : "draw";

  let detail: string | null = null;
  if (us.shootoutScore !== undefined && them.shootoutScore !== undefined) {
    detail = `t.a.b. ${us.shootoutScore}-${them.shootoutScore}`;
  } else if (competition.status.type.name === "STATUS_FINAL_AET") {
    detail = "a.p.";
  }

  return {
    id: event.id,
    date: event.date,
    competition: COMPETITION_LABELS[slug] ?? event.league?.abbreviation ?? event.league?.name ?? "",
    home: us.homeAway === "home",
    opponent: toTeam(them.team),
    goalsFor,
    goalsAgainst,
    outcome,
    detail,
    europeanCup: europeanCup(slug),
  };
}

function toTeamResults(data: EspnScheduleResponse, teamId: string): TeamResult[] {
  return (data.events ?? [])
    .map((event) => toTeamResult(event, teamId))
    .filter((result): result is TeamResult => result !== null);
}

function toFixture(event: EspnScheduleEvent, teamId: string): TeamFixture | null {
  const competition = event.competitions[0];
  const us = competition?.competitors.find((c) => c.team.id === teamId);
  const them = competition?.competitors.find((c) => c.team.id !== teamId);
  if (!competition || !us || !them) return null;
  const slug = event.league?.slug ?? "";
  return {
    id: event.id,
    date: event.date,
    competition: COMPETITION_LABELS[slug] ?? event.league?.abbreviation ?? event.league?.name ?? "",
    home: us.homeAway === "home",
    opponent: toTeam(them.team),
    venue: competition.venue?.fullName ?? null,
    europeanCup: europeanCup(slug),
  };
}

/** Un match encore « à venir » après son heure reste le prochain match tant qu'ESPN ne l'a pas lancé. */
const KICKOFF_GRACE = 3 * 60 * 60_000;

/** Prochain match officiel pas encore commencé (les scoreboards disent si un match a déjà démarré). */
function nextFixture(events: EspnScheduleEvent[], teamId: string, started: ReadonlySet<string>): TeamFixture | null {
  const now = Date.now();
  const upcoming = events
    .filter(
      (event) =>
        !started.has(event.id) &&
        isOfficial(event.league?.slug ?? "") &&
        event.competitions[0]?.status.type.state === "pre" &&
        Date.parse(event.date) > now - KICKOFF_GRACE,
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const event of upcoming) {
    const fixture = toFixture(event, teamId);
    if (fixture) return fixture;
  }
  return null;
}

/** Match officiel du club en cours de jeu, avec son score. */
function liveFixture(events: EspnScheduleEvent[], teamId: string): TeamLiveMatch | null {
  for (const event of events) {
    const competition = event.competitions[0];
    if (!competition || competition.status.type.state !== "in" || !isOfficial(event.league?.slug ?? "")) continue;
    const fixture = toFixture(event, teamId);
    const us = competition.competitors.find((c) => c.team.id === teamId);
    const them = competition.competitors.find((c) => c.team.id !== teamId);
    if (!fixture || !us || !them) continue;
    return {
      ...fixture,
      goalsFor: us.score?.value ?? Number(us.score?.displayValue ?? 0),
      goalsAgainst: them.score?.value ?? Number(them.score?.displayValue ?? 0),
      clock: statusLabel(competition.status, event.date),
    };
  }
  return null;
}

/** Compétitions officielles d'un club du championnat : le championnat, les coupes du pays, les coupes d'Europe. */
function clubCompetitions(league: League): string[] {
  const country = `${league.espnCode.split(".")[0]}.`;
  return Object.keys(COMPETITION_LABELS).filter(
    (slug) =>
      slug === league.espnCode ||
      (slug.startsWith(country) && !NATIONAL_LEAGUE.test(slug)) ||
      Object.hasOwn(EUROPEAN_CUPS, slug),
  );
}

/**
 * Matchs d'hier et d'aujourd'hui d'un club, lus dans les scoreboards de ses compétitions. Ils sont tenus
 * à jour en direct, alors que le calendrier d'un club garde parfois de longues minutes de retard sur le
 * coup d'envoi ou le coup de sifflet final. Chaque scoreboard est partagé par tous les clubs (copie en mémoire).
 */
async function recentClubMatches(league: League, teamId: string): Promise<{ slug: string; match: Match }[]> {
  const now = new Date();
  const yesterday = addDays(now, -1);
  const start = espnDate(yesterday);
  const end = espnDate(now);
  const months = espnMonths(addDays(yesterday, -1), addDays(now, 1));
  const pages = await Promise.all(
    clubCompetitions(league).flatMap((slug) =>
      months.map(async (month) => {
        const data = await espnFetch<EspnScoreboardResponse>(`/site/v2/sports/soccer/${slug}/scoreboard`, {
          memoryTtl: MEMORY_TTL.team,
          params: { dates: month, limit: 500 },
        }).catch(() => null);
        return (data?.events ?? []).map((event) => ({ slug, event }));
      }),
    ),
  );

  return pages.flat().flatMap(({ slug, event }) => {
    const day = espnDate(new Date(event.date));
    const plays = event.competitions[0]?.competitors.some((competitor) => competitor.team.id === teamId);
    const match = plays && day >= start && day <= end ? toMatch(event, slug) : null;
    return match ? [{ slug, match }] : [];
  });
}

function clubSides(match: Match, teamId: string) {
  const home = match.home.team.id === teamId;
  return { home, us: home ? match.home : match.away, them: home ? match.away : match.home };
}

function resultFromMatch(match: Match, slug: string, teamId: string): TeamResult | null {
  const { home, us, them } = clubSides(match, teamId);
  // Un match reporté ou annulé est « terminé » sans score : il ne compte pas.
  if (match.state !== "post" || us.score === null || them.score === null) return null;

  let outcome: MatchOutcome;
  if (us.winner) outcome = "win";
  else if (them.winner) outcome = "loss";
  else outcome = us.score > them.score ? "win" : us.score < them.score ? "loss" : "draw";

  let detail: string | null = null;
  if (us.shootout !== null && them.shootout !== null) detail = `t.a.b. ${us.shootout}-${them.shootout}`;
  else if (match.status === STATUS_LABELS.STATUS_FINAL_AET) detail = "a.p.";

  return {
    id: match.id,
    date: match.date,
    competition: COMPETITION_LABELS[slug] ?? slug,
    home,
    opponent: them.team,
    goalsFor: us.score,
    goalsAgainst: them.score,
    outcome,
    detail,
    europeanCup: europeanCup(slug),
  };
}

function liveFromMatch(match: Match, slug: string, teamId: string): TeamLiveMatch | null {
  if (match.state !== "in") return null;
  const { home, us, them } = clubSides(match, teamId);
  return {
    id: match.id,
    date: match.date,
    competition: COMPETITION_LABELS[slug] ?? slug,
    home,
    opponent: them.team,
    venue: match.venue,
    europeanCup: europeanCup(slug),
    goalsFor: us.score ?? 0,
    goalsAgainst: them.score ?? 0,
    clock: match.status,
  };
}

/** Prochain match d'après le calendrier stocké dans le site, quand celui d'ESPN est en retard ou incomplet. */
function calendarFixture(teamId: string, started: ReadonlySet<string>): TeamFixture | null {
  let after = Date.now() - KICKOFF_GRACE;
  // Un match déjà lancé d'après les scoreboards est écarté : on passe au suivant.
  for (let attempt = 0; attempt < 5; attempt++) {
    const next = nextCalendarMatch(teamId, after);
    if (!next) return null;
    const { calendar, match } = next;
    if (started.has(match.id)) {
      after = Date.parse(match.date);
      continue;
    }
    const home = match.home === teamId;
    const opponentId = home ? match.away : match.home;
    const opponent = calendar.teams[opponentId];
    const undecided = !opponent || /^TBD\b/i.test(opponent.name);
    return {
      id: match.id,
      date: match.date,
      competition: COMPETITION_LABELS[calendar.espnCode] ?? calendar.espnCode,
      home,
      opponent: {
        id: opponentId,
        name: undecided ? "À déterminer" : opponent.name,
        shortName: undecided ? "À déterminer" : opponent.shortName,
        abbreviation: undecided ? "?" : opponent.abbreviation,
        logo: undecided ? null : opponent.logo,
      },
      venue: match.venue,
      europeanCup: null,
    };
  }
  return null;
}

/** Forme d'un club (derniers matchs officiels, toutes compétitions), match en cours et prochain match. */
export async function getTeamForm(teamId: string, league: League, count = 5): Promise<TeamForm | null> {
  const schedule = `/site/v2/sports/soccer/all/teams/${teamId}/schedule`;
  // Copies en mémoire de courte durée : un score ou un résultat doit apparaître pendant le match,
  // pas une heure plus tard.
  const [current, fixtures, recent] = await Promise.all([
    espnFetch<EspnScheduleResponse>(schedule, { memoryTtl: MEMORY_TTL.team }),
    // Le calendrier à venir est un bonus : s'il manque, la forme du club s'affiche quand même.
    espnFetch<EspnScheduleResponse>(schedule, { memoryTtl: MEMORY_TTL.team, params: { fixture: "true" } }).catch(
      () => null,
    ),
    recentClubMatches(league, teamId),
  ]);
  if (!current.team) return null;

  // Les scoreboards priment sur le calendrier du club, souvent en retard juste après un match.
  const fresh = recent
    .map(({ slug, match }) => resultFromMatch(match, slug, teamId))
    .filter((result): result is TeamResult => result !== null);
  const freshLive = recent.map(({ slug, match }) => liveFromMatch(match, slug, teamId)).find((live) => live !== null);
  const started = new Set(recent.filter(({ match }) => match.state !== "pre").map(({ match }) => match.id));

  // En cas de doublon, la version du scoreboard (placée après) remplace celle du calendrier.
  let results = [...toTeamResults(current, teamId), ...fresh];

  // Bilan de la saison en cours : tous les matchs officiels déjà joués, hors saison précédente.
  const season = [...new Map(results.map((result) => [result.id, result])).values()].reduce<TeamSeasonTotals>(
    (totals, result) => ({
      played: totals.played + 1,
      wins: totals.wins + (result.outcome === "win" ? 1 : 0),
      draws: totals.draws + (result.outcome === "draw" ? 1 : 0),
      losses: totals.losses + (result.outcome === "loss" ? 1 : 0),
      goalsFor: totals.goalsFor + result.goalsFor,
      goalsAgainst: totals.goalsAgainst + result.goalsAgainst,
    }),
    { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 },
  );

  // En début de saison, on complète avec la fin de la saison précédente, toutes compétitions
  // confondues (indispensable pour un club promu, absent du championnat la saison passée).
  if (new Set(results.map((result) => result.id)).size < count) {
    const year = current.season?.year ?? new Date().getFullYear();
    const previous = await espnFetch<EspnScheduleResponse>(`/site/v2/sports/soccer/all/teams/${teamId}/schedule`, {
      revalidate: REVALIDATE.previousSeason,
      params: { season: year - 1 },
    });
    results = [...toTeamResults(previous, teamId), ...results];
  }

  const unique = [...new Map(results.map((result) => [result.id, result])).values()];
  const scheduleLive = liveFixture([...(current.events ?? []), ...(fixtures?.events ?? [])], teamId);
  return {
    team: toTeam(current.team),
    season,
    results: unique.sort((a, b) => b.date.localeCompare(a.date)).slice(0, count),
    live: freshLive ?? (scheduleLive && !started.has(scheduleLive.id) ? scheduleLive : null),
    // Le plus proche entre le calendrier ESPN du club et celui du site (coupes d'Europe comprises côté ESPN).
    next:
      [nextFixture(fixtures?.events ?? [], teamId, started), calendarFixture(teamId, started)]
        .filter((fixture): fixture is TeamFixture => fixture !== null)
        .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null,
  };
}

// --- Coupes nationales ---

const CUP_WINDOW_DAYS = { past: 60, next: 150 };

function calendarEntries(data: EspnScoreboardResponse) {
  const group = data.leagues?.[0]?.calendar?.[0];
  return typeof group === "object" && group !== null ? ((group as EspnCalendarGroup).entries ?? []) : [];
}

/** ESPN nomme « TBD Home » / « TBD Away » l'adversaire d'un tour pas encore tiré. */
export function withUndecidedTeams(match: Match): Match {
  const side = (s: MatchSide): MatchSide =>
    /^TBD\b/i.test(s.team.name)
      ? { ...s, team: { ...s.team, name: "À déterminer", shortName: "À déterminer", abbreviation: "?", logo: null } }
      : s;
  return { ...match, home: side(match.home), away: side(match.away) };
}

function toCupMatch(event: EspnEvent, competition: string): CupMatch | null {
  const match = toMatch(event, competition);
  if (!match) return null;
  return {
    match: withUndecidedTeams(match),
    round: event.season?.slug ? roundLabel(event.season.slug) : null,
    leg: legLabel(event.competitions[0]?.notes),
  };
}

/** Tours, résultats récents et prochains matchs d'une coupe nationale. */
export async function getCupOverview(cup: Cup): Promise<CupOverview> {
  const path = `/site/v2/sports/soccer/${cup.espnCode}/scoreboard`;
  const now = new Date();
  const [info, items] = await Promise.all([
    // Sans le calendrier des tours d'ESPN, la page s'appuie sur le calendrier officiel.
    espnFetch<EspnScoreboardResponse>(path, { revalidate: REVALIDATE.cupInfo }).catch(() => null),
    competitionMatches(cup.slug, addDays(now, -CUP_WINDOW_DAYS.past), addDays(now, CUP_WINDOW_DAYS.next), {
      revalidate: REVALIDATE.matches,
    }),
  ]);

  const league = info?.leagues?.[0];
  const calendar = CUP_CALENDARS[cup.slug];
  // ESPN injoignable : on considère l'édition du calendrier officiel comme en cours.
  const espnSeason = info ? (league?.season?.displayName?.match(/\d{4}-\d{2}/)?.[0] ?? "") : calendar.season;
  // ESPN n'a pas encore ouvert la nouvelle édition : on suit le calendrier officiel publié.
  const forecast = calendar.season > espnSeason;
  const withCalendar = forecast || calendar.season === espnSeason;

  const entries = info ? calendarEntries(info) : [];
  // Tours pas encore programmés : ESPN leur attribue à tous la même plage fictive (« Oct 6-Jun 30 »).
  const detailCount = new Map<string, number>();
  for (const entry of entries) {
    if (entry.detail) detailCount.set(entry.detail, (detailCount.get(entry.detail) ?? 0) + 1);
  }
  const espnRounds = entries.map((entry) => ({
    key: roundKey(entry.label),
    label: roundLabel(entry.label),
    dates: entry.detail && (detailCount.get(entry.detail) ?? 0) > 1 ? null : frenchDateRange(entry.detail),
    start: entry.startDate,
    end: entry.endDate,
  }));

  // Matchs de la fenêtre, avec leur tour (ESPN, sinon calendrier du site) et les jours programmés par tour.
  const matchDays = new Map<string, string[]>();
  const matches: CupMatch[] = [];
  for (const { match, event, fixture } of items) {
    const roundSlug = event?.season?.slug ?? fixture?.round ?? null;
    const otherSeason =
      event?.season?.year !== undefined &&
      league?.season?.year !== undefined &&
      event.season.year !== league.season.year;
    if (roundSlug && !forecast && !otherSeason) {
      const key = roundKey(roundSlug);
      matchDays.set(key, [...(matchDays.get(key) ?? []), dayKey(match.date)]);
    }
    const calendarLeg = fixture?.leg === 1 ? "Match aller" : fixture?.leg === 2 ? "Match retour" : null;
    matches.push({
      match: withUndecidedTeams(match),
      round: roundSlug ? roundLabel(roundSlug) : null,
      leg: event ? legLabel(event.competitions[0]?.notes) : calendarLeg,
    });
  }

  const rounds = buildRounds({
    espn: forecast ? [] : espnRounds,
    calendar: withCalendar ? calendar : undefined,
    matchDays,
  });

  const results = matches
    .filter((m) => m.match.state === "post")
    .sort((a, b) => b.match.date.localeCompare(a.match.date));
  const upcoming = matches
    .filter((m) => m.match.state !== "post")
    .sort((a, b) => a.match.date.localeCompare(b.match.date));

  const lastRound = rounds.at(-1);
  const finished = lastRound !== undefined && Date.parse(lastRound.end) < now.getTime();
  const lastEspnRound = entries.at(-1);
  const espnFinished = lastEspnRound !== undefined && Date.parse(lastEspnRound.endDate) < now.getTime();

  // Aucun match à l'horizon (édition terminée, la suivante pas encore publiée par ESPN) :
  // on retrouve la dernière finale pour que la page reste utile.
  let lastFinal: CupMatch | null = null;
  if (matches.length === 0 && espnFinished && lastEspnRound && /final/i.test(lastEspnRound.label)) {
    const events = await scoreboardEvents(path, new Date(lastEspnRound.startDate), new Date(lastEspnRound.endDate), {
      revalidate: REVALIDATE.previousSeason,
    }).catch(() => []);
    const final = events.find((event) => event.season?.slug === "final") ?? events.at(-1);
    lastFinal = final ? toCupMatch(final, cup.espnCode) : null;
  }

  return {
    season: forecast ? calendar.season : espnSeason,
    finished,
    forecast,
    rounds,
    results,
    upcoming,
    lastFinal,
    calendar: withCalendar
      ? {
          updatedAt: calendar.updatedAt,
          espnFrom: calendar.espnFrom,
          note: calendar.note ?? null,
          sources: calendar.sources,
          checkedWith: calendar.checkedWith,
        }
      : null,
  };
}

/** Matchs de coupe d'hier et d'aujourd'hui, pour le suivi en direct. */
export async function getCupLiveMatches(cup: Cup): Promise<Match[]> {
  const now = new Date();
  const events = await scoreboardEvents(`/site/v2/sports/soccer/${cup.espnCode}/scoreboard`, addDays(now, -1), now, {
    memoryTtl: MEMORY_TTL.live,
  });
  return events
    .map((event) => toCupMatch(event, cup.espnCode))
    .filter((item): item is CupMatch => item !== null)
    .map((item) => item.match);
}
