import "server-only";

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
    played: recordGames(competitor),
    shootout: showScore && typeof competitor.shootoutScore === "number" ? competitor.shootoutScore : null,
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

/** Matchs joués ou programmés entre deux dates (incluses), triés chronologiquement. */
export async function getMatches(
  league: League,
  from: Date,
  to: Date = from,
  cache: CacheOptions = { revalidate: REVALIDATE.matches },
): Promise<Match[]> {
  const events = await scoreboardEvents(soccer(league, "scoreboard"), from, to, cache);
  return events
    .map(toMatch)
    .filter((m): m is Match => m !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Matchs d'hier et d'aujourd'hui (un match du soir peut finir après minuit), pour le suivi en direct. */
export async function getLiveMatches(league: League): Promise<Match[]> {
  const now = new Date();
  return getMatches(league, addDays(now, -1), now, { memoryTtl: MEMORY_TTL.live });
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
    const match = plays && day >= start && day <= end ? toMatch(event) : null;
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
    results: unique.sort((a, b) => b.date.localeCompare(a.date)).slice(0, count),
    live: freshLive ?? (scheduleLive && !started.has(scheduleLive.id) ? scheduleLive : null),
    next: nextFixture(fixtures?.events ?? [], teamId, started),
  };
}

// --- Coupes nationales ---

const CUP_WINDOW_DAYS = { past: 60, next: 150 };

function calendarEntries(data: EspnScoreboardResponse) {
  const group = data.leagues?.[0]?.calendar?.[0];
  return typeof group === "object" && group !== null ? ((group as EspnCalendarGroup).entries ?? []) : [];
}

/** ESPN nomme « TBD Home » / « TBD Away » l'adversaire d'un tour pas encore tiré. */
function withUndecidedTeams(match: Match): Match {
  const side = (s: MatchSide): MatchSide =>
    /^TBD\b/i.test(s.team.name)
      ? { ...s, team: { ...s.team, name: "À déterminer", shortName: "À déterminer", abbreviation: "?", logo: null } }
      : s;
  return { ...match, home: side(match.home), away: side(match.away) };
}

function toCupMatch(event: EspnEvent): CupMatch | null {
  const match = toMatch(event);
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
  const [info, recentEvents] = await Promise.all([
    espnFetch<EspnScoreboardResponse>(path, { revalidate: REVALIDATE.cupInfo }),
    scoreboardEvents(path, addDays(now, -CUP_WINDOW_DAYS.past), addDays(now, CUP_WINDOW_DAYS.next), {
      revalidate: REVALIDATE.matches,
    }),
  ]);

  const league = info.leagues?.[0];
  const espnSeason = league?.season?.displayName?.match(/\d{4}-\d{2}/)?.[0] ?? "";
  const calendar = CUP_CALENDARS[cup.slug];
  // ESPN n'a pas encore ouvert la nouvelle édition : on suit le calendrier officiel publié.
  const forecast = calendar.season > espnSeason;
  const withCalendar = forecast || calendar.season === espnSeason;

  const entries = calendarEntries(info);
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

  // Jours réellement programmés par ESPN pour chaque tour de l'édition (heure de Paris).
  const matchDays = new Map<string, string[]>();
  if (!forecast) {
    for (const event of recentEvents) {
      const slug = event.season?.slug;
      const otherSeason =
        event.season?.year !== undefined &&
        league?.season?.year !== undefined &&
        event.season.year !== league.season.year;
      if (!slug || otherSeason) continue;
      const key = roundKey(slug);
      matchDays.set(key, [...(matchDays.get(key) ?? []), dayKey(event.date)]);
    }
  }

  const rounds = buildRounds({
    espn: forecast ? [] : espnRounds,
    calendar: withCalendar ? calendar : undefined,
    matchDays,
  });

  const matches = recentEvents.map(toCupMatch).filter((m): m is CupMatch => m !== null);
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
    lastFinal = final ? toCupMatch(final) : null;
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
    .map(toCupMatch)
    .filter((item): item is CupMatch => item !== null)
    .map((item) => item.match);
}
