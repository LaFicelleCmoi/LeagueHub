import "server-only";

import bundesliga from "@/data/calendrier/bundesliga.json";
import copaDelRey from "@/data/calendrier/copa-del-rey.json";
import coppaItalia from "@/data/calendrier/coppa-italia.json";
import coupeDeFrance from "@/data/calendrier/coupe-de-france.json";
import dfbPokal from "@/data/calendrier/dfb-pokal.json";
import faCup from "@/data/calendrier/fa-cup.json";
import laLiga from "@/data/calendrier/la-liga.json";
import ligue1 from "@/data/calendrier/ligue-1.json";
import premierLeague from "@/data/calendrier/premier-league.json";
import serieA from "@/data/calendrier/serie-a.json";
import type { CupSlug } from "./cups";
import { dayKey } from "./format";
import type { LeagueSlug } from "./leagues";

// Calendrier stocké dans le site (src/data/calendrier), relevé chaque nuit chez ESPN par
// scripts/sync-calendar.mts. Il organise les pages : quels matchs afficher, quand et où.
// Scores, minute et événements sont ensuite lus en direct chez ESPN.

export type CalendarSlug = LeagueSlug | CupSlug;

export interface CalendarTeam {
  name: string;
  shortName: string;
  abbreviation: string;
  logo: string | null;
}

export interface CalendarMatch {
  /** Identifiant ESPN du match : il relie le calendrier au score en direct. */
  id: string;
  date: string;
  home: string;
  away: string;
  venue: string | null;
  /** Coupes : slug du tour (« round-of-16 ») et manche d'un aller-retour. */
  round?: string | null;
  leg?: 1 | 2 | null;
}

export interface CompetitionCalendar {
  slug: CalendarSlug;
  espnCode: string;
  season: string;
  teams: Record<string, CalendarTeam>;
  /** Triés dans l'ordre chronologique. */
  matches: CalendarMatch[];
}

const CALENDARS = {
  "premier-league": premierLeague,
  "la-liga": laLiga,
  "serie-a": serieA,
  bundesliga,
  "ligue-1": ligue1,
  "fa-cup": faCup,
  "copa-del-rey": copaDelRey,
  "coppa-italia": coppaItalia,
  "dfb-pokal": dfbPokal,
  "coupe-de-france": coupeDeFrance,
} as unknown as Record<CalendarSlug, CompetitionCalendar>;

export function getCalendar(slug: CalendarSlug): CompetitionCalendar {
  return CALENDARS[slug];
}

/** Matchs du calendrier entre deux jours (heure de Paris, inclus), dans l'ordre chronologique. */
export function calendarMatchesBetween(slug: CalendarSlug, from: Date, to: Date): CalendarMatch[] {
  const start = dayKey(from);
  const end = dayKey(to);
  return CALENDARS[slug].matches.filter((match) => {
    const day = dayKey(match.date);
    return day >= start && day <= end;
  });
}

/** Premier match d'un club après un instant donné, toutes compétitions du calendrier confondues. */
export function nextCalendarMatch(
  teamId: string,
  after: number,
): { calendar: CompetitionCalendar; match: CalendarMatch } | null {
  let best: { calendar: CompetitionCalendar; match: CalendarMatch } | null = null;
  for (const calendar of Object.values(CALENDARS)) {
    const match = calendar.matches.find(
      (item) => (item.home === teamId || item.away === teamId) && Date.parse(item.date) > after,
    );
    if (match && (!best || match.date < best.match.date)) best = { calendar, match };
  }
  return best;
}

/** Une journée de championnat s'étale du vendredi au lundi : 4 jours à partir du premier match. */
const ROUND_DAYS = 4;

/**
 * Première journée à venir (jour de Paris après aujourd'hui) où au moins une des compétitions joue :
 * son premier coup d'envoi, le nombre de matchs ce jour-là et sur l'ensemble de la journée.
 */
export function nextMatchDay(
  slugs: CalendarSlug[],
  now: Date = new Date(),
): { day: string; firstKickoff: string; count: number; roundCount: number } | null {
  const today = dayKey(now);
  let best: string | null = null;
  for (const slug of slugs) {
    const match = CALENDARS[slug].matches.find((item) => dayKey(item.date) > today);
    if (match && (!best || dayKey(match.date) < best)) best = dayKey(match.date);
  }
  if (!best) return null;
  const matches = slugs.flatMap((slug) => CALENDARS[slug].matches.filter((item) => dayKey(item.date) === best));
  matches.sort((a, b) => a.date.localeCompare(b.date));
  const roundEnd = dayKey(new Date(Date.parse(matches[0].date) + (ROUND_DAYS - 1) * 86_400_000));
  const roundCount = slugs.reduce(
    (sum, slug) =>
      sum +
      CALENDARS[slug].matches.filter((item) => {
        const day = dayKey(item.date);
        return day >= best && day <= roundEnd;
      }).length,
    0,
  );
  return { day: best, firstKickoff: matches[0].date, count: matches.length, roundCount };
}
