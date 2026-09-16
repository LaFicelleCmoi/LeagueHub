// Relève le calendrier des 5 championnats et des 5 coupes nationales chez ESPN et l'écrit dans
// src/data/calendrier/<compétition>.json. L'organisation du site (quels matchs, quand, où, quel tour)
// ne dépend ainsi plus des réponses d'ESPN au moment de l'affichage : scores, minute et événements
// restent lus en direct. Lancé chaque nuit par .github/workflows/calendrier.yml.
//
// Usage : npm run calendrier

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { CUPS } from "../src/lib/cups.ts";
import { LEAGUES } from "../src/lib/leagues.ts";

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const OUT_DIR = fileURLToPath(new URL("../src/data/calendrier/", import.meta.url));
/** Une liste qui fond de plus de moitié trahit une réponse incomplète d'ESPN : on garde l'ancienne. */
const MIN_KEPT_RATIO = 0.5;

interface EspnTeam {
  id: string;
  displayName: string;
  shortDisplayName?: string;
  abbreviation?: string;
  logo?: string;
}

interface EspnEvent {
  id: string;
  date: string;
  season?: { year?: number; slug?: string };
  competitions: {
    venue?: { fullName?: string };
    notes?: { headline?: string; text?: string }[];
    competitors: { homeAway: "home" | "away"; team: EspnTeam }[];
  }[];
}

interface CalendarTeam {
  name: string;
  shortName: string;
  abbreviation: string;
  logo: string | null;
}

interface CalendarMatch {
  id: string;
  date: string;
  home: string;
  away: string;
  venue: string | null;
  round?: string | null;
  leg?: 1 | 2 | null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchEvents(url: string): Promise<EspnEvent[]> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as { events?: EspnEvent[] };
      return data.events ?? [];
    } catch (error) {
      lastError = error;
      await sleep(1500 * attempt);
    }
  }
  throw new Error(`${url} : ${String(lastError)}`);
}

/** Saison en cours (de juillet à juin) et ses 12 mois au format ESPN (« 202609 »). */
function currentSeason(now = new Date()) {
  const startYear = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = new Date(Date.UTC(startYear, 6 + index, 1));
    return `${month.getUTCFullYear()}${String(month.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  return { startYear, label: `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`, months };
}

function legOf(notes: EspnEvent["competitions"][number]["notes"]): 1 | 2 | null {
  const text = (notes ?? []).map((note) => note.headline ?? note.text ?? "").join(" ");
  if (/1st leg/i.test(text)) return 1;
  if (/2nd leg/i.test(text)) return 2;
  return null;
}

/** JSON stable et lisible dans un diff : une équipe ou un match par ligne. */
function serialize(file: {
  slug: string;
  espnCode: string;
  season: string;
  teams: Record<string, CalendarTeam>;
  matches: CalendarMatch[];
}): string {
  const teams = Object.keys(file.teams)
    .sort((a, b) => Number(a) - Number(b))
    .map((id) => `    ${JSON.stringify(id)}: ${JSON.stringify(file.teams[id])}`);
  const matches = file.matches.map((match) => `    ${JSON.stringify(match)}`);
  return [
    "{",
    `  "slug": ${JSON.stringify(file.slug)},`,
    `  "espnCode": ${JSON.stringify(file.espnCode)},`,
    `  "season": ${JSON.stringify(file.season)},`,
    `  "teams": {${teams.length ? `\n${teams.join(",\n")}\n  ` : ""}},`,
    `  "matches": [${matches.length ? `\n${matches.join(",\n")}\n  ` : ""}]`,
    "}",
    "",
  ].join("\n");
}

async function syncCompetition(slug: string, espnCode: string, kind: "league" | "cup", season: ReturnType<typeof currentSeason>) {
  const events = new Map<string, EspnEvent>();
  for (const month of season.months) {
    for (const event of await fetchEvents(`${ESPN}/${espnCode}/scoreboard?dates=${month}&limit=500`)) {
      // Les mois de juillet et juin peuvent contenir la fin ou le début d'une autre édition.
      if (event.season?.year !== undefined && event.season.year !== season.startYear) continue;
      events.set(event.id, event);
    }
  }

  const teams: Record<string, CalendarTeam> = {};
  const matches: CalendarMatch[] = [];
  for (const event of events.values()) {
    const competition = event.competitions[0];
    const home = competition?.competitors.find((competitor) => competitor.homeAway === "home");
    const away = competition?.competitors.find((competitor) => competitor.homeAway === "away");
    if (!competition || !home || !away) continue;

    for (const { team } of [home, away]) {
      teams[team.id] = {
        name: team.displayName,
        shortName: team.shortDisplayName ?? team.displayName,
        abbreviation: team.abbreviation ?? team.displayName.slice(0, 3).toUpperCase(),
        logo: team.logo ?? null,
      };
    }

    const match: CalendarMatch = {
      id: event.id,
      date: event.date,
      home: home.team.id,
      away: away.team.id,
      venue: competition.venue?.fullName ?? null,
    };
    if (kind === "cup") {
      match.round = event.season?.slug ?? null;
      match.leg = legOf(competition.notes);
    }
    matches.push(match);
  }
  matches.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const path = `${OUT_DIR}${slug}.json`;
  const previous = await readFile(path, "utf8").catch(() => null);
  const previousCount = previous ? ((JSON.parse(previous) as { matches: unknown[] }).matches?.length ?? 0) : 0;
  if (previous && previousCount >= 20 && matches.length < previousCount * MIN_KEPT_RATIO) {
    return `ignoré : ${matches.length} matchs contre ${previousCount} auparavant (réponse ESPN incomplète ?)`;
  }

  const content = serialize({ slug, espnCode, season: season.label, teams, matches });
  if (content === previous) return `inchangé (${matches.length} matchs)`;
  await writeFile(path, content);
  return `mis à jour : ${matches.length} matchs, ${Object.keys(teams).length} équipes`;
}

const season = currentSeason();
await mkdir(OUT_DIR, { recursive: true });
console.log(`Calendrier ${season.label}`);

let failures = 0;
const competitions = [
  ...LEAGUES.map((league) => ({ slug: league.slug, espnCode: league.espnCode, kind: "league" as const })),
  ...CUPS.map((cup) => ({ slug: cup.slug, espnCode: cup.espnCode, kind: "cup" as const })),
];
for (const { slug, espnCode, kind } of competitions) {
  try {
    console.log(`- ${slug} : ${await syncCompetition(slug, espnCode, kind, season)}`);
  } catch (error) {
    failures += 1;
    // Le fichier précédent reste en place : le site garde le dernier calendrier connu.
    console.error(`- ${slug} : échec, fichier conservé (${String(error)})`);
  }
}

if (failures === competitions.length) process.exit(1);
