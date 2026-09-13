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
  team: EspnTeam;
}

export interface EspnDetail {
  type: { id: string; text: string };
  clock?: { value?: number; displayValue: string };
  team?: { id: string };
  scoringPlay?: boolean;
  redCard?: boolean;
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
}

export interface EspnEvent {
  id: string;
  date: string;
  name: string;
  status: EspnStatus;
  competitions: EspnCompetition[];
}

export interface EspnScoreboardResponse {
  events?: EspnEvent[];
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
