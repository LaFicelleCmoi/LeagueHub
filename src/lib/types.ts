// Modèles de données normalisés utilisés par l'interface.
// Les réponses brutes d'ESPN sont typées dans `lib/espn/types.ts`.

import type { LeagueSlug } from "./leagues";

export interface Team {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  logo: string | null;
}

export type ZoneTone = "ucl" | "uel" | "uecl" | "playoff" | "relegation" | "other";

export interface Zone {
  label: string;
  tone: ZoneTone;
  /** Place qualificative pour un tour préliminaire. */
  qualifying: boolean;
}

export interface StandingRow {
  rank: number;
  rankChange: number;
  team: Team;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  zone: Zone | null;
}

export interface Standings {
  season: string;
  rows: StandingRow[];
}

export type MatchState = "pre" | "in" | "post";

export interface MatchSide {
  team: Team;
  score: number | null;
  winner: boolean;
  /** Matchs de championnat joués selon le bilan ESPN (un match en cours n'y est pas encore compté). */
  played: number | null;
  /** Tirs au but réussis, en cas de séance. */
  shootout: number | null;
}

export type MatchEventKind = "goal" | "penalty" | "own-goal" | "red-card";

export interface MatchEvent {
  minute: string;
  player: string;
  kind: MatchEventKind;
  side: "home" | "away";
}

export interface Match {
  id: string;
  date: string;
  state: MatchState;
  /** Libellé affiché : heure du coup d'envoi, minute de jeu, « Terminé »… */
  status: string;
  venue: string | null;
  home: MatchSide;
  away: MatchSide;
  events: MatchEvent[];
}

export interface Leader {
  id: string;
  rank: number;
  player: string;
  team: Team | null;
  value: number;
  appearances: number | null;
}

export interface Leaders {
  goals: Leader[];
  assists: Leader[];
}

export interface Article {
  id: string;
  headline: string;
  description: string;
  published: string;
  image: string | null;
  url: string | null;
}

/** Un club et son championnat. */
export interface ClubRef {
  team: Team;
  league: LeagueSlug;
}

/** Coupes d'Europe : Ligue des champions, Ligue Europa, Ligue Conférence. */
export type EuropeanCup = "ucl" | "uel" | "uecl";

export type MatchOutcome = "win" | "draw" | "loss";

export interface TeamResult {
  id: string;
  date: string;
  competition: string;
  /** Match joué à domicile ? */
  home: boolean;
  opponent: Team;
  goalsFor: number;
  goalsAgainst: number;
  outcome: MatchOutcome;
  /** Précision éventuelle : « t.a.b. 4-3 », « a.p. »… */
  detail: string | null;
  /** Coupe d'Europe concernée, pour un affichage dédié. */
  europeanCup: EuropeanCup | null;
}

export interface TeamFixture {
  id: string;
  date: string;
  competition: string;
  home: boolean;
  opponent: Team;
  venue: string | null;
  europeanCup: EuropeanCup | null;
}

export interface TeamForm {
  team: Team;
  /** Du plus récent au plus ancien. */
  results: TeamResult[];
  /** Prochain match officiel, s'il est déjà programmé. */
  next: TeamFixture | null;
}

/** Tour d'une coupe nationale, d'après le calendrier ESPN. */
export interface CupRoundPrize {
  /** Dotation du vainqueur d'un match du tour. */
  winner: string;
  loser: string | null;
}

export interface CupRound {
  /** Slug commun avec ESPN, ex. « round-of-16 ». */
  key: string;
  label: string;
  /** Dates en français, ex. « 21–24 août et 1er–2 sept. ». */
  dates: string | null;
  start: string;
  end: string;
  /** Dates du calendrier officiel : ESPN n'a pas encore publié les matchs du tour. */
  forecast: boolean;
  twoLegged: boolean;
  draw: string | null;
  fixtures: number | null;
  /** Clubs en lice avant et après le tour, ex. « 116 → 60 ». */
  clubs: string | null;
  entries: string | null;
  prize: CupRoundPrize | null;
  venue: string | null;
  note: string | null;
}

export interface CupCalendarInfo {
  /** Date du relevé (AAAA-MM-JJ). */
  updatedAt: string;
  /** Slug du premier tour publié par ESPN. */
  espnFrom: string;
  note: string | null;
  sources: { label: string; url: string }[];
  checkedWith: string[];
}

export interface CupMatch {
  match: Match;
  round: string | null;
  /** « Match aller » ou « Match retour » pour une confrontation en deux manches. */
  leg: string | null;
}

export interface CupOverview {
  season: string;
  /** Le dernier tour de l'édition est passé. */
  finished: boolean;
  /** ESPN n'a pas encore ouvert l'édition : tours et dates viennent du calendrier officiel. */
  forecast: boolean;
  rounds: CupRound[];
  /** Du plus récent au plus ancien. */
  results: CupMatch[];
  /** Du plus proche au plus lointain. */
  upcoming: CupMatch[];
  /** Dernière finale, quand aucune nouvelle édition n'est encore programmée. */
  lastFinal: CupMatch | null;
  /** Calendrier officiel de l'édition affichée, s'il est connu. */
  calendar: CupCalendarInfo | null;
}
