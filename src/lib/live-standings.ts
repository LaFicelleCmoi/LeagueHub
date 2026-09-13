import type { Match, StandingRow, Standings } from "./types";

// Classement en direct : on part du classement officiel ESPN et on y ajoute le
// résultat provisoire des matchs du jour qu'il ne compte pas encore.

export interface LiveResult {
  match: Match;
  side: "home" | "away";
  /** Points ajoutés au classement officiel : 3, 1 ou 0. */
  points: number;
}

export interface LiveStandingRow extends StandingRow {
  /** Rang dans le classement officiel. */
  officialRank: number;
  live: LiveResult | null;
}

export interface LiveStandings {
  rows: LiveStandingRow[];
  /** Au moins un résultat provisoire est pris en compte. */
  provisional: boolean;
}

export function preMatchKey(matchId: string, teamId: string): string {
  return `${matchId}:${teamId}`;
}

/**
 * Ce match manque-t-il au classement officiel pour cette équipe ?
 * - En cours : ESPN ne le compte jamais avant la fin.
 * - Terminé : si on l'a vu en cours pendant la visite, le classement le compte dès qu'il a plus de
 *   matchs qu'avant le coup d'envoi. Sinon, le bilan ESPN du match l'inclut déjà : notre copie du
 *   classement est en retard tant qu'elle compte moins de matchs que ce bilan.
 */
function isMissing(row: StandingRow, match: Match, played: number | null, preMatchPlayed: number | undefined): boolean {
  if (match.state === "in") return true;
  if (match.state !== "post") return false;
  if (preMatchPlayed !== undefined) return row.played <= preMatchPlayed;
  return played !== null && row.played < played;
}

export function computeLiveStandings(
  standings: Standings,
  matches: Match[],
  preMatchPlayed: ReadonlyMap<string, number>,
): LiveStandings {
  const results = new Map<string, LiveResult>();

  for (const match of matches) {
    if (match.home.score === null || match.away.score === null) continue;
    for (const side of ["home", "away"] as const) {
      const us = match[side];
      const them = match[side === "home" ? "away" : "home"];
      const row = standings.rows.find((r) => r.team.id === us.team.id);
      const pre = preMatchPlayed.get(preMatchKey(match.id, us.team.id));
      if (!row || !isMissing(row, match, us.played, pre)) continue;

      const goalsFor = us.score ?? 0;
      const goalsAgainst = them.score ?? 0;
      const points = goalsFor > goalsAgainst ? 3 : goalsFor === goalsAgainst ? 1 : 0;
      results.set(us.team.id, { match, side, points });
    }
  }

  const rows: LiveStandingRow[] = standings.rows.map((row) => {
    const live = results.get(row.team.id) ?? null;
    if (!live) return { ...row, officialRank: row.rank, live };

    const goalsFor = live.match[live.side].score ?? 0;
    const goalsAgainst = live.match[live.side === "home" ? "away" : "home"].score ?? 0;
    return {
      ...row,
      officialRank: row.rank,
      live,
      played: row.played + 1,
      wins: row.wins + (live.points === 3 ? 1 : 0),
      draws: row.draws + (live.points === 1 ? 1 : 0),
      losses: row.losses + (live.points === 0 ? 1 : 0),
      goalsFor: row.goalsFor + goalsFor,
      goalsAgainst: row.goalsAgainst + goalsAgainst,
      goalDiff: row.goalDiff + goalsFor - goalsAgainst,
      points: row.points + live.points,
    };
  });

  // Aucun résultat provisoire : on garde l'ordre officiel et ses critères de départage.
  if (results.size === 0) return { rows, provisional: false };

  const sorted = [...rows]
    .sort(
      (a, b) =>
        b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || a.officialRank - b.officialRank,
    )
    // Les zones (Ligue des champions, relégation…) dépendent de la place, pas de l'équipe.
    .map((row, index) => ({ ...row, rank: index + 1, zone: standings.rows[index]?.zone ?? null }));

  return { rows: sorted, provisional: true };
}
