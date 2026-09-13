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
