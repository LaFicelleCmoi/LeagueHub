// Relève le palmarès des clubs des 5 championnats sur Wikidata (les saisons de compétition y
// désignent leur vainqueur) et l'écrit dans src/data/palmares/<championnat>.json.
// Les titres changent quelques fois par an : le relevé tourne une fois par semaine.
//
// Usage : npm run palmares

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { LEAGUES, type LeagueSlug } from "../src/lib/leagues.ts";

const OUT_DIR = fileURLToPath(new URL("../src/data/palmares/", import.meta.url));
const ENDPOINT = "https://query.wikidata.org/sparql";
const AGENT = "LeagueHub/1.0 (https://github.com/LaFicelleCmoi/LeagueHub)";

/** Identifiant Wikidata de chaque championnat, pour retrouver ses clubs. */
const LEAGUE_ITEM: Record<LeagueSlug, string> = {
  "premier-league": "Q9448",
  "la-liga": "Q324867",
  "serie-a": "Q15804",
  bundesliga: "Q82595",
  "ligue-1": "Q13394",
};

type Scope = "national" | "europe" | "monde" | "autre";

interface Trophy {
  key: string;
  label: string;
  count: number;
  first: string | null;
  last: string | null;
  scope: Scope;
}

interface ClubPalmares {
  qid: string;
  name: string;
  total: number;
  trophies: Trophy[];
}

interface PalmaresFile {
  slug: string;
  updatedAt: string;
  clubs: Record<string, ClubPalmares>;
}

/** Regroupe les anciens noms d'une même compétition (« First Division » puis « Premier League »). */
const NATIONAL: Record<LeagueSlug, { key: string; label: string; test: RegExp }[]> = {
  "premier-league": [
    { key: "championnat", label: "Championnat d'Angleterre", test: /^(championnat d'angleterre de football|premier league|football league|football league first division|first division)$/i },
    { key: "coupe", label: "Coupe d'Angleterre (FA Cup)", test: /^(coupe d'angleterre de football|fa cup)$/i },
    { key: "coupe-ligue", label: "Coupe de la Ligue anglaise", test: /^(coupe de la ligue anglaise de football|efl cup|football league cup|league cup)$/i },
    { key: "supercoupe", label: "Community Shield", test: /^(community shield|fa community shield|charity shield)$/i },
  ],
  "la-liga": [
    { key: "championnat", label: "Championnat d'Espagne", test: /^(championnat d'espagne de football|la liga|primera divisi[oó]n)$/i },
    { key: "coupe", label: "Coupe du Roi", test: /^(coupe d'espagne de football|copa del rey)$/i },
    { key: "supercoupe", label: "Supercoupe d'Espagne", test: /^(supercoupe d'espagne de football|supercopa de espa[nñ]a|coupe eva duarte)$/i },
  ],
  "serie-a": [
    { key: "championnat", label: "Championnat d'Italie", test: /^(championnat d'italie de football|serie a|divisione nazionale|prima categoria)$/i },
    { key: "coupe", label: "Coupe d'Italie", test: /^(coupe d'italie de football|coppa italia)$/i },
    { key: "supercoupe", label: "Supercoupe d'Italie", test: /^(supercoupe d'italie de football|supercoppa italiana)$/i },
  ],
  bundesliga: [
    { key: "championnat", label: "Championnat d'Allemagne", test: /^(championnat d'allemagne de football|bundesliga|german football championship|deutsche fu[sß]ballmeisterschaft)$/i },
    { key: "coupe", label: "Coupe d'Allemagne", test: /^(coupe d'allemagne de football|dfb[- ]pokal)$/i },
    { key: "coupe-ligue", label: "Coupe de la Ligue allemande", test: /^(coupe de la ligue d'allemagne de football|dfb[- ]ligapokal|dfl[- ]ligapokal)$/i },
    { key: "supercoupe", label: "Supercoupe d'Allemagne", test: /^(supercoupe d'allemagne de football|dfl[- ]supercup)$/i },
  ],
  "ligue-1": [
    { key: "championnat", label: "Championnat de France", test: /^(championnat de france de football|ligue 1|division 1)$/i },
    { key: "coupe", label: "Coupe de France", test: /^coupe de france de football$/i },
    { key: "coupe-ligue", label: "Coupe de la Ligue française", test: /^coupe de la ligue fran[cç]aise de football$/i },
    { key: "supercoupe", label: "Trophée des champions", test: /^troph[eé]e des champions$/i },
  ],
};

const INTERNATIONAL: { key: string; label: string; scope: Scope; test: RegExp }[] = [
  { key: "c1", label: "Ligue des champions", scope: "europe", test: /^(ligue des champions de l'uefa|coupe des clubs champions europ[eé]ens|uefa champions league)$/i },
  { key: "c3", label: "Ligue Europa", scope: "europe", test: /^(ligue europa|ligue europa de l'uefa|uefa cup|coupe uefa)$/i },
  { key: "c4", label: "Ligue Conférence", scope: "europe", test: /conf[eé]rence league|uefa conference league/i },
  { key: "c2", label: "Coupe des coupes", scope: "europe", test: /vainqueurs de coupe/i },
  { key: "supercoupe-europe", label: "Supercoupe d'Europe", scope: "europe", test: /^(supercoupe de l'uefa|uefa super cup)$/i },
  { key: "villes-foires", label: "Coupe des villes de foires", scope: "europe", test: /villes de foires|inter-cities fairs/i },
  { key: "mondial", label: "Coupe du monde des clubs", scope: "monde", test: /^coupe du monde des clubs de la fifa$/i },
  { key: "intercontinentale", label: "Coupe intercontinentale", scope: "monde", test: /^coupe intercontinentale$/i },
];

/** Natures de compétition retenues ; le reste (tournois amicaux, jeunes) est écarté. */
const KEEP_TYPES = [
  "association football league", "football league", "sports league", "professional sports league",
  "national association football cup", "football cup", "league cup", "association football super cup",
  "super cup", "association football club competition", "international association football clubs super cup",
  "club world championship", "championship", "association football competition",
];
const DROP_TYPES = ["friendly association football tournament", "youth sports competition", "youth competition", "women's association football"];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function sparql<T = Record<string, { value: string }>>(query: string): Promise<T[]> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(`${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`, {
        headers: { Accept: "application/sparql-results+json", "User-Agent": AGENT },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as { results: { bindings: T[] } };
      return data.results.bindings;
    } catch (error) {
      lastError = error;
      await sleep(3000 * attempt);
    }
  }
  throw new Error(String(lastError));
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(fc|cf|ac|as|sc|ss|ssc|afc|ud|cd|rc|rcd|sd|us|calcio|club|de|of|the|football|futbol)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "");
}

/** Clubs du championnat sur Wikidata, appariés aux noms d'ESPN. */
async function resolveClubs(slug: LeagueSlug, teams: Record<string, { name: string }>) {
  // Équipes engagées dans les saisons récentes : liste courte et fiable. La propriété « championnat »
  // renvoie, elle, des milliers de clubs de toute l'histoire et la réponse est parfois tronquée.
  let rows = await sparql<{ club: { value: string }; clubLabel: { value: string } }>(`
    SELECT DISTINCT ?club ?clubLabel WHERE {
      ?season wdt:P3450 wd:${LEAGUE_ITEM[slug]} ; wdt:P580 ?start ; wdt:P1923 ?club .
      FILTER(YEAR(?start) >= 2015)
      SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en,de,es,it". }
    } LIMIT 300`);

  if (rows.length < 15) {
    rows = await sparql<{ club: { value: string }; clubLabel: { value: string } }>(`
      SELECT DISTINCT ?club ?clubLabel WHERE {
        ?club wdt:P118 wd:${LEAGUE_ITEM[slug]} .
        SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en,de,es,it". }
      } LIMIT 300`);
  }

  const candidates = rows.map((row) => ({
    qid: row.club.value.split("/").pop() ?? "",
    keys: new Set([normalize(row.clubLabel.value)]),
  }));

  // Les alias (« Mainz 05 », « Die Roten ») sont demandés à part : groupés, ils font échouer la requête.
  const aliases = await sparql<{ club: { value: string }; aliases: { value: string } }>(`
    SELECT ?club (GROUP_CONCAT(DISTINCT ?alias; separator="|") AS ?aliases) WHERE {
      VALUES ?club { ${candidates.map((candidate) => `wd:${candidate.qid}`).join(" ")} }
      ?club skos:altLabel ?alias FILTER(LANG(?alias) IN ("fr","en","de","es","it"))
    } GROUP BY ?club`).catch(() => []);
  for (const row of aliases) {
    const qid = row.club.value.split("/").pop() ?? "";
    const candidate = candidates.find((item) => item.qid === qid);
    for (const alias of row.aliases.value.split("|")) candidate?.keys.add(normalize(alias));
  }

  const resolved: Record<string, string> = {};
  for (const [id, team] of Object.entries(teams)) {
    const key = normalize(team.name);
    const exact = candidates.find((candidate) => candidate.keys.has(key));
    if (exact) {
      resolved[id] = exact.qid;
      continue;
    }

    // Rapprochement partiel : on retient le nom le plus proche, et seulement s'il se détache
    // nettement. « Paris FC » ne doit pas être confondu avec « Paris Saint-Germain ».
    const near = candidates
      .flatMap((candidate) => {
        const best = [...candidate.keys]
          .filter((k) => k.length > 3 && (k.includes(key) || key.includes(k)))
          .sort((a, b) => Math.abs(a.length - key.length) - Math.abs(b.length - key.length))[0];
        return best ? [{ qid: candidate.qid, distance: Math.abs(best.length - key.length) }] : [];
      })
      .sort((a, b) => a.distance - b.distance);
    if (near.length > 0 && (near.length === 1 || near[1].distance - near[0].distance >= 3)) {
      resolved[id] = near[0].qid;
    } else if (near.length > 1) {
      console.error(`   ${team.name} : rapprochement ambigu, palmarès ignoré`);
    }
  }
  return resolved;
}

function groupTrophies(slug: LeagueSlug, rows: { comp: string; label: string; types: Set<string>; season: string; year: string | null }[]): Trophy[] {
  // Une saison est identifiée par son année de début : « Football League 1900-01 » et
  // « championnat d'Angleterre de football 1900-1901 » désignent le même titre.
  const groups = new Map<string, { label: string; scope: Scope; seasons: Set<string>; years: Set<string> }>();
  for (const row of rows) {
    if ([...row.types].some((type) => DROP_TYPES.includes(type))) continue;
    if (![...row.types].some((type) => KEEP_TYPES.includes(type))) continue;

    const national = NATIONAL[slug].find((rule) => rule.test.test(row.label));
    const international = INTERNATIONAL.find((rule) => rule.test.test(row.label));
    const key = national?.key ?? international?.key ?? `autre:${row.comp}`;
    const label = national?.label ?? international?.label ?? row.label;
    const scope: Scope = national ? "national" : (international?.scope ?? "autre");

    const group = groups.get(key) ?? { label, scope, seasons: new Set<string>(), years: new Set<string>() };
    group.seasons.add(row.year ?? row.season);
    if (row.year) group.years.add(row.year);
    groups.set(key, group);
  }

  const order: Scope[] = ["national", "europe", "monde", "autre"];
  return [...groups]
    .map(([key, group]) => {
      const years = [...group.years].sort();
      return {
        key,
        label: group.label,
        count: group.seasons.size,
        first: years[0] ?? null,
        last: years.at(-1) ?? null,
        scope: group.scope,
      };
    })
    .sort((a, b) => order.indexOf(a.scope) - order.indexOf(b.scope) || b.count - a.count || a.label.localeCompare(b.label, "fr"));
}

/** Palmarès de plusieurs clubs en une requête : Wikidata répond plus vite qu'en les enchaînant. */
async function palmaresBatch(slug: LeagueSlug, qids: string[]): Promise<Map<string, Trophy[]>> {
  const values = qids.map((qid) => `wd:${qid}`).join(" ");
  const rows = await sparql<{
    club: { value: string };
    season: { value: string };
    seasonLabel: { value: string };
    comp: { value: string };
    compLabel: { value: string };
    types?: { value: string };
  }>(`
    SELECT ?club ?season ?seasonLabel ?comp ?compLabel (GROUP_CONCAT(DISTINCT ?typeLabel; separator="|") AS ?types) WHERE {
      VALUES ?club { ${values} }
      ?season wdt:P1346 ?club ; wdt:P3450 ?comp .
      OPTIONAL { ?comp wdt:P31 ?type . ?type rdfs:label ?typeLabel FILTER(LANG(?typeLabel) = "en") }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
    } GROUP BY ?club ?season ?seasonLabel ?comp ?compLabel`);

  const byClub = new Map<string, { comp: string; label: string; types: Set<string>; season: string; year: string | null }[]>();
  for (const row of rows) {
    const qid = row.club.value.split("/").pop() ?? "";
    byClub.set(qid, [
      ...(byClub.get(qid) ?? []),
      {
        comp: row.comp.value.split("/").pop() ?? "",
        label: row.compLabel.value,
        types: new Set((row.types?.value ?? "").split("|").map((type) => type.toLowerCase()).filter(Boolean)),
        season: row.season.value,
        // Année de début de la saison, commune aux différents libellés d'une même édition.
        year: row.seasonLabel.value.match(/(1[89]\d{2}|20\d{2})/)?.[1] ?? null,
      },
    ]);
  }
  return new Map([...byClub].map(([qid, clubRows]) => [qid, groupTrophies(slug, clubRows)]));
}

const today = new Date().toISOString().slice(0, 10);
await mkdir(OUT_DIR, { recursive: true });

for (const league of LEAGUES) {
  const path = `${OUT_DIR}${league.slug}.json`;
  const previous = JSON.parse(
    await readFile(path, "utf8").catch(() => '{"clubs":{}}'),
  ) as Partial<PalmaresFile>;
  const calendar = JSON.parse(
    await readFile(fileURLToPath(new URL(`../src/data/calendrier/${league.slug}.json`, import.meta.url)), "utf8"),
  ) as { teams: Record<string, { name: string }> };

  let resolved: Record<string, string> = {};
  try {
    resolved = await resolveClubs(league.slug, calendar.teams);
  } catch (error) {
    console.error(`- ${league.slug} : clubs non résolus (${String(error)})`);
  }

  const clubs: Record<string, ClubPalmares> = {};
  let failures = 0;
  const entries = Object.entries(calendar.teams).flatMap(([id, team]) => {
    const qid = resolved[id] ?? previous.clubs?.[id]?.qid;
    if (!qid) {
      console.error(`   ${team.name} : aucun identifiant Wikidata`);
      return [];
    }
    return [{ id, name: team.name, qid }];
  });

  const BATCH = 5;
  for (let index = 0; index < entries.length; index += BATCH) {
    const batch = entries.slice(index, index + BATCH);
    try {
      const results = await palmaresBatch(league.slug, batch.map((entry) => entry.qid));
      for (const entry of batch) {
        const trophies = results.get(entry.qid) ?? [];
        clubs[entry.id] = {
          qid: entry.qid,
          name: entry.name,
          total: trophies.reduce((sum, trophy) => sum + trophy.count, 0),
          trophies,
        };
      }
      await sleep(1200);
    } catch (error) {
      failures += 1;
      // Palmarès précédent conservé : mieux vaut une donnée d'hier qu'une page vide.
      for (const entry of batch) {
        const kept = previous.clubs?.[entry.id];
        if (kept) clubs[entry.id] = kept;
      }
      console.error(`   ${batch.map((entry) => entry.name).join(", ")} : échec (${String(error)})`);
    }
  }

  const file: PalmaresFile = { slug: league.slug, updatedAt: today, clubs };
  const content = `${JSON.stringify(file, null, 2)}\n`;
  const before = await readFile(path, "utf8").catch(() => null);
  const unchanged = before && before.replace(/"updatedAt": "[^"]+"/, "") === content.replace(/"updatedAt": "[^"]+"/, "");
  if (unchanged) {
    console.log(`- ${league.slug} : inchangé (${Object.keys(clubs).length} clubs)`);
  } else {
    await writeFile(path, content);
    console.log(`- ${league.slug} : ${Object.keys(clubs).length} clubs, ${failures} échecs`);
  }
}
