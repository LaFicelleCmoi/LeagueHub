import type { Match, Standings } from "./types";

// Chiffres clés affichés en tête de l'accueil et de chaque championnat.

export interface SeasonTotals {
  /** Buts marqués en championnat depuis le début de la saison. */
  goals: number;
  /** Matchs de championnat joués. */
  matches: number;
}

/** Totaux de la saison régulière, tirés du classement (chaque but compte une fois : celui de l'équipe qui marque). */
export function seasonTotals(standings: Standings | null): SeasonTotals {
  const rows = standings?.rows ?? [];
  return {
    goals: rows.reduce((sum, row) => sum + row.goalsFor, 0),
    matches: Math.round(rows.reduce((sum, row) => sum + row.played, 0) / 2),
  };
}

export function addTotals(totals: SeasonTotals[]): SeasonTotals {
  return totals.reduce((sum, t) => ({ goals: sum.goals + t.goals, matches: sum.matches + t.matches }), {
    goals: 0,
    matches: 0,
  });
}

/** Buts marqués dans une liste de matchs (matchs à venir exclus). */
export function goalsInMatches(matches: Match[]): number {
  return matches.reduce((sum, match) => sum + (match.home.score ?? 0) + (match.away.score ?? 0), 0);
}

const oneDecimal = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** « 2,8 par match · 38 matchs », ou null avant le premier match. */
export function goalsPerMatchHint({ goals, matches }: SeasonTotals): string | null {
  if (matches === 0) return null;
  return `${oneDecimal.format(goals / matches)} par match · ${matches} ${plural(matches, "match", "matchs")}`;
}

/** Accord français : singulier pour 0 et 1. */
export function plural(count: number, one: string, many: string): string {
  return count > 1 ? many : one;
}
