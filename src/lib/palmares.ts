import "server-only";

import bundesliga from "@/data/palmares/bundesliga.json";
import laLiga from "@/data/palmares/la-liga.json";
import ligue1 from "@/data/palmares/ligue-1.json";
import premierLeague from "@/data/palmares/premier-league.json";
import serieA from "@/data/palmares/serie-a.json";
import type { LeagueSlug } from "./leagues";

// Palmarès des clubs, relevé chaque semaine sur Wikidata par scripts/sync-palmares.mts.

export type TrophyScope = "national" | "europe" | "monde" | "autre";

export interface Trophy {
  key: string;
  label: string;
  count: number;
  /** Années des sacres, dans l'ordre. Une saison dont le libellé n'a pas de millésime n'y figure pas. */
  years: string[];
  scope: TrophyScope;
}

export interface ClubPalmares {
  /** Élément Wikidata du club, source du palmarès. */
  qid: string;
  name: string;
  total: number;
  trophies: Trophy[];
}

interface PalmaresFile {
  slug: string;
  /** Date du relevé (AAAA-MM-JJ). */
  updatedAt: string;
  clubs: Record<string, ClubPalmares>;
}

const FILES = {
  "premier-league": premierLeague,
  "la-liga": laLiga,
  "serie-a": serieA,
  bundesliga,
  "ligue-1": ligue1,
} as unknown as Record<LeagueSlug, PalmaresFile>;

/** Périmètres mis en avant, dans l'ordre d'affichage ; « autre » est replié à part. */
export const TROPHY_SCOPES: { scope: TrophyScope; label: string }[] = [
  { scope: "national", label: "Titres nationaux" },
  { scope: "europe", label: "Europe" },
  { scope: "monde", label: "Monde" },
];

export function getPalmares(league: LeagueSlug, teamId: string): { club: ClubPalmares; updatedAt: string } | null {
  const file = FILES[league];
  const club = file?.clubs[teamId];
  return club ? { club, updatedAt: file.updatedAt } : null;
}
