// Typage (partiel) des réponses JSON de l'API ESPN.
// Seuls les champs réellement exploités sont déclarés.

export interface EspnLogo {
  href: string;
  rel?: string[];
}

export interface EspnTeam {
  id: string;
  displayName: string;
  shortDisplayName?: string;
  name?: string;
  abbreviation?: string;
  logo?: string;
  logos?: EspnLogo[];
}

export interface EspnStat {
  name: string;
  value?: number;
  displayValue: string;
}

// --- Classement : /apis/v2/sports/soccer/{league}/standings ---

export interface EspnStandingEntry {
  team: EspnTeam;
  stats: EspnStat[];
  note?: {
    color?: string;
    description?: string;
    rank?: number;
  };
}

export interface EspnStandingsResponse {
  name: string;
  children?: {
    name: string;
    standings: {
      seasonDisplayName?: string;
      entries: EspnStandingEntry[];
    };
  }[];
}

// --- Matchs : /apis/site/v2/sports/soccer/{league}/scoreboard ---

export interface EspnStatus {
  displayClock?: string;
  period?: number;
  type: {
    name: string;
    state: "pre" | "in" | "post";
    completed: boolean;
    description: string;
    detail: string;
    shortDetail: string;
  };
}

export interface EspnCompetitor {
  id: string;
  homeAway: "home" | "away";
  winner?: boolean;
  score?: string;
  shootoutScore?: number;
  team: EspnTeam;
  /** Bilan « victoires-nuls-défaites » ; un match terminé y est inclus, un match en cours non. */
  records?: { type?: string; summary?: string }[];
}

export interface EspnDetail {
  type: { id: string; text: string };
  clock?: { value?: number; displayValue: string };
  team?: { id: string };
  scoringPlay?: boolean;
  redCard?: boolean;
  yellowCard?: boolean;
  penaltyKick?: boolean;
  ownGoal?: boolean;
  shootout?: boolean;
  athletesInvolved?: { id: string; displayName: string; shortName?: string }[];
}

export interface EspnCompetition {
  id: string;
  date: string;
  status: EspnStatus;
  venue?: { fullName?: string; address?: { city?: string; country?: string } };
  competitors: EspnCompetitor[];
  details?: EspnDetail[];
  /** Ex. « 1st Leg » pour une confrontation aller-retour. */
  notes?: { headline?: string; text?: string }[];
}

export interface EspnEvent {
  id: string;
  date: string;
  name: string;
  status: EspnStatus;
  competitions: EspnCompetition[];
  /** Tour de la compétition, ex. « second-round » en coupe, et année de début de l'édition. */
  season?: { slug?: string; year?: number };
}

export interface EspnCalendarGroup {
  label?: string;
  entries?: { label: string; detail?: string; value?: string; startDate: string; endDate: string }[];
}

export interface EspnScoreboardResponse {
  events?: EspnEvent[];
  leagues?: {
    season?: { displayName?: string; year?: number };
    /** Dates des journées en championnat, tours détaillés en coupe. */
    calendar?: (string | EspnCalendarGroup)[];
  }[];
}

// --- Statistiques : /apis/site/v2/sports/soccer/{league}/statistics ---

export interface EspnLeader {
  value: number;
  displayValue: string;
  athlete: {
    id: string;
    displayName: string;
    shortName?: string;
    team?: EspnTeam;
    statistics?: EspnStat[];
  };
}

export interface EspnStatisticsResponse {
  stats?: {
    name: string;
    displayName: string;
    leaders?: EspnLeader[];
  }[];
}

// --- Actualités : /apis/site/v2/sports/soccer/{league}/news ---

export interface EspnArticle {
  id?: number;
  type?: string;
  headline: string;
  description?: string;
  published: string;
  premium?: boolean;
  images?: { url: string; alt?: string; caption?: string; type?: string }[];
  links?: { web?: { href: string } };
}

export interface EspnNewsResponse {
  articles?: EspnArticle[];
}

// --- Calendrier d'une équipe : /apis/site/v2/sports/soccer/{league|all}/teams/{id}/schedule ---

export interface EspnScheduleCompetitor {
  id: string;
  homeAway: "home" | "away";
  winner?: boolean;
  score?: { value?: number; displayValue?: string };
  shootoutScore?: number;
  team: EspnTeam;
}

export interface EspnScheduleEvent {
  id: string;
  date: string;
  league?: { name?: string; abbreviation?: string; slug?: string };
  competitions: {
    status: EspnStatus;
    competitors: EspnScheduleCompetitor[];
    venue?: { fullName?: string };
  }[];
}

export interface EspnScheduleResponse {
  team?: EspnTeam;
  season?: { year?: number };
  events?: EspnScheduleEvent[];
}

// --- Détail d'un match : /apis/site/v2/sports/soccer/{league}/summary?event={id} ---

export interface EspnKeyEvent {
  id: string;
  /** `type.type` : slug de l'action (« goal---header », « yellow-card », « substitution »…). */
  type?: { id?: string; text?: string; type?: string };
  text?: string;
  clock?: { displayValue?: string };
  team?: { id?: string; displayName?: string };
  participants?: { athlete?: { id?: string; displayName?: string } }[];
  scoringPlay?: boolean;
}

export interface EspnRosterPlayer {
  starter?: boolean;
  jersey?: string;
  formationPlace?: string;
  athlete: { id: string; displayName: string };
  position?: { abbreviation?: string; displayName?: string };
  subbedIn?: boolean;
  subbedOut?: boolean;
  stats?: EspnStat[];
  plays?: { clock?: { displayValue?: string }; substitution?: boolean }[];
}

export interface EspnSummaryResponse {
  header?: { competitions?: EspnCompetition[] };
  keyEvents?: EspnKeyEvent[];
  commentary?: { time?: { displayValue?: string }; text?: string }[];
  boxscore?: { teams?: { team: EspnTeam; homeAway?: "home" | "away"; statistics?: (EspnStat & { label?: string })[] }[] };
  rosters?: { homeAway: "home" | "away"; team: EspnTeam; formation?: string; roster?: EspnRosterPlayer[] }[];
  gameInfo?: {
    venue?: { fullName?: string; address?: { city?: string; country?: string } };
    attendance?: number;
    officials?: { displayName?: string; fullName?: string; position?: { name?: string; displayName?: string } }[];
  };
  broadcasts?: { media?: { shortName?: string; name?: string } }[];
}
