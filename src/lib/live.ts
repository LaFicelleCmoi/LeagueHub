import type { Match } from "./types";

// Règles du suivi des scores en direct, partagées entre le serveur (choix des
// matchs à suivre) et le navigateur (décider s'il faut rafraîchir).

/** Intervalle entre deux actualisations des scores dans le navigateur. */
export const LIVE_POLL_INTERVAL = 20_000;

/** On commence à suivre un match 10 minutes avant le coup d'envoi… */
const BEFORE_KICKOFF = 10 * 60_000;
/** …et on abandonne un match toujours « à venir » 3 h après l'heure prévue. */
const AFTER_KICKOFF = 3 * 60 * 60_000;
/** Seuls les matchs des prochaines 24 h peuvent démarrer pendant une visite. */
const TRACKING_HORIZON = 24 * 60 * 60_000;

export type TrackedMatch = Pick<Match, "id" | "date" | "state">;

/** Le match est-il en cours, ou sur le point de commencer ? */
export function needsLiveUpdate(match: TrackedMatch, now: number): boolean {
  if (match.state === "in") return true;
  if (match.state !== "pre") return false;
  const kickoff = Date.parse(match.date);
  return kickoff - now <= BEFORE_KICKOFF && now - kickoff <= AFTER_KICKOFF;
}

/** Matchs susceptibles d'évoluer pendant la visite : en cours ou prévus dans les 24 h. */
export function selectTrackedMatches(matches: Match[], now: number): TrackedMatch[] {
  return matches
    .filter((match) => {
      if (match.state === "in") return true;
      const kickoff = Date.parse(match.date);
      return match.state === "pre" && kickoff - now <= TRACKING_HORIZON && now - kickoff <= AFTER_KICKOFF;
    })
    .map(({ id, date, state }) => ({ id, date, state }));
}
