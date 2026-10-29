import "server-only";

import { getCalendar } from "./calendar";
import { ALL_LEAGUES, type LeagueSlug } from "./leagues";

// Index des clubs de tous les championnats (deuxièmes divisions comprises), construit à partir du calendrier stocké dans le site.
// Il alimente la barre de recherche de l'en-tête et les pages de club.

export interface ClubIndexEntry {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  logo: string | null;
  color?: string | null;
  league: LeagueSlug;
}

export function clubIndex(): ClubIndexEntry[] {
  return ALL_LEAGUES.flatMap((league) => {
    const calendar = getCalendar(league.slug);
    return Object.entries(calendar.teams).map(([id, team]) => ({ id, ...team, league: league.slug }));
  }).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export function findClub(league: LeagueSlug, id: string): ClubIndexEntry | undefined {
  const team = getCalendar(league).teams[id];
  return team ? { id, ...team, league } : undefined;
}
