import { roundLabel, type CupSlug } from "./cups";
import { TIME_ZONE } from "./format";
import type { CupRound } from "./types";

// Calendrier officiel 2026-27 des 5 coupes nationales, relevé auprès des fédérations et ligues
// (FA, FFF, RFEF, Lega Serie A, DFB) via leurs publications et Wikipédia, puis recoupé avec ESPN,
// OpenLigaDB et TheSportsDB. Il complète ESPN, qui ne publie un tour qu'une fois tiré et ignore
// les tours de qualification : dates, tirages, nombre de matchs, entrées en lice, dotations, stades.

/** Plage de jeu en jours de Paris (AAAA-MM-JJ) ; `to` absent pour un seul jour. */
export interface PlayWindow {
  from: string;
  to?: string;
}

export interface PlannedRound {
  /** Slug du tour, identique à celui d'ESPN (« first-round », « round-of-16 »…). */
  key: string;
  /** Une plage par manche, ou par semaine quand les matchs d'un tour sont étalés. */
  windows: PlayWindow[];
  twoLegged?: boolean;
  draw?: string;
  /** Nombre de matchs (les deux manches comptent pour un aller-retour). */
  fixtures?: number;
  /** Clubs en lice avant et après le tour (« 116 → 60 »). */
  clubs?: string;
  entries?: string;
  /** Dotation par match, en livres : [vainqueur, perdant]. */
  prize?: [number, number | null];
  venue?: string;
  note?: string;
}

export interface CupCalendar {
  season: string;
  /** Date du relevé (AAAA-MM-JJ). */
  updatedAt: string;
  /** Premier tour publié par ESPN : les précédents n'y apparaissent jamais. */
  espnFrom: string;
  note?: string;
  sources: { label: string; url: string }[];
  checkedWith: string[];
  rounds: PlannedRound[];
}

const UPDATED_AT = "2026-09-15";

export const CUP_CALENDARS: Record<CupSlug, CupCalendar> = {
  "fa-cup": {
    season: "2026-27",
    updatedAt: UPDATED_AT,
    espnFrom: "first-round",
    note: "Dates principales (le samedi) : les matchs d’un même tour s’étalent souvent du vendredi au lundi.",
    sources: [
      { label: "The FA", url: "https://www.thefa.com/competitions/thefacup/round-dates" },
      { label: "Wikipédia", url: "https://en.wikipedia.org/wiki/2026%E2%80%9327_FA_Cup" },
      {
        label: "Wikipédia (qualifications)",
        url: "https://en.wikipedia.org/wiki/2026%E2%80%9327_FA_Cup_qualifying_rounds",
      },
    ],
    checkedWith: ["ESPN (édition 2025-26)", "TheSportsDB"],
    rounds: [
      {
        key: "extra-preliminary-round",
        windows: [{ from: "2026-08-08" }],
        draw: "3 juil. 2026",
        fixtures: 219,
        entries: "438 clubs des niveaux 8 et 9",
        prize: [1_125, 375],
      },
      { key: "preliminary-round", windows: [{ from: "2026-08-22" }], fixtures: 136, entries: "53 clubs de niveau 8", prize: [1_444, 481] },
      { key: "first-qualifying-round", windows: [{ from: "2026-09-05" }], fixtures: 112, entries: "88 clubs de niveau 7", prize: [2_250, 750] },
      {
        key: "second-qualifying-round",
        windows: [{ from: "2026-09-19" }],
        fixtures: 80,
        entries: "48 clubs de National League North et South",
        prize: [3_375, 1_125],
      },
      { key: "third-qualifying-round", windows: [{ from: "2026-10-03" }], fixtures: 40, prize: [5_625, 1_875] },
      {
        key: "fourth-qualifying-round",
        windows: [{ from: "2026-10-17" }],
        fixtures: 32,
        entries: "24 clubs de National League",
        prize: [9_375, 3_125],
      },
      {
        key: "first-round",
        windows: [{ from: "2026-11-07" }],
        fixtures: 40,
        clubs: "124 → 84",
        entries: "24 clubs de League One et 24 de League Two",
        prize: [47_750, 15_800],
      },
      { key: "second-round", windows: [{ from: "2026-12-05" }], fixtures: 20, clubs: "84 → 64", prize: [79_500, 21_200] },
      {
        key: "third-round",
        windows: [{ from: "2027-01-09" }],
        fixtures: 32,
        clubs: "64 → 32",
        entries: "20 clubs de Premier League et 24 de Championship",
        prize: [121_500, 26_500],
      },
      { key: "fourth-round", windows: [{ from: "2027-02-13" }], fixtures: 16, clubs: "32 → 16", prize: [127_000, null] },
      { key: "fifth-round", windows: [{ from: "2027-03-06" }], fixtures: 8, clubs: "16 → 8", prize: [238_500, null] },
      { key: "quarterfinals", windows: [{ from: "2027-04-03" }], fixtures: 4, clubs: "8 → 4", prize: [477_000, null] },
      { key: "semifinals", windows: [{ from: "2027-04-24" }], fixtures: 2, clubs: "4 → 2", prize: [1_060_000, 530_000] },
      {
        key: "final",
        windows: [{ from: "2027-05-22" }],
        fixtures: 1,
        clubs: "2 → 1",
        prize: [2_120_000, 1_060_000],
        venue: "Wembley Stadium, Londres",
      },
    ],
  },

  "copa-del-rey": {
    season: "2026-27",
    updatedAt: UPDATED_AT,
    espnFrom: "qualifying-round",
    note: "Matchs secs du 1er tour aux quarts, chez le club de la division la plus basse.",
    sources: [{ label: "Wikipédia", url: "https://en.wikipedia.org/wiki/2026%E2%80%9327_Copa_del_Rey" }],
    checkedWith: ["ESPN", "TheSportsDB"],
    rounds: [
      {
        key: "qualifying-round",
        windows: [
          { from: "2026-09-26", to: "2026-09-27" },
          { from: "2026-10-03", to: "2026-10-04" },
        ],
        twoLegged: true,
        draw: "10 sept. 2026",
        fixtures: 20,
        clubs: "126 → 116",
        entries: "Clubs qualifiés par la 6e division 2025-26",
      },
      {
        key: "first-round",
        windows: [{ from: "2026-10-28" }],
        draw: "octobre 2026",
        fixtures: 56,
        clubs: "116 → 60",
        entries: "Tous les autres qualifiés, sauf les 4 clubs de la Supercopa",
      },
      { key: "second-round", windows: [{ from: "2026-12-02" }], draw: "novembre 2026", fixtures: 28, clubs: "60 → 32" },
      {
        key: "round-of-32",
        windows: [{ from: "2026-12-16" }],
        draw: "décembre 2026",
        fixtures: 16,
        clubs: "32 → 16",
        entries: "Les 4 clubs de la Supercopa d’Espagne",
      },
      { key: "round-of-16", windows: [{ from: "2027-01-06" }], draw: "décembre 2026", fixtures: 8, clubs: "16 → 8" },
      { key: "quarterfinals", windows: [{ from: "2027-01-13" }], draw: "janvier 2027", fixtures: 4, clubs: "8 → 4" },
      {
        key: "semifinals",
        windows: [{ from: "2027-02-10" }, { from: "2027-03-03" }],
        twoLegged: true,
        draw: "janvier 2027",
        fixtures: 4,
        clubs: "4 → 2",
      },
      {
        key: "final",
        windows: [{ from: "2027-04-24" }],
        fixtures: 1,
        clubs: "2 → 1",
        venue: "Estadio de La Cartuja, Séville",
        note: "Le vainqueur est qualifié pour la Ligue Europa 2027-28",
      },
    ],
  },

  "coppa-italia": {
    season: "2026-27",
    updatedAt: UPDATED_AT,
    espnFrom: "preliminary-round",
    note: "Tableau fixé à l’avance : les 8 têtes de série de Serie A n’entrent qu’en 8es de finale.",
    sources: [
      {
        label: "Lega Serie A (règlement)",
        url: "https://img.legaseriea.it/vimages/6654a871/253%20-%20Regolamento%20Coppa%20Italia%20Frecciarossa%202024-2027.pdf",
      },
      { label: "Wikipédia", url: "https://en.wikipedia.org/wiki/2026%E2%80%9327_Coppa_Italia" },
    ],
    checkedWith: ["ESPN", "TheSportsDB"],
    rounds: [
      {
        key: "preliminary-round",
        windows: [{ from: "2026-08-08", to: "2026-08-09" }],
        fixtures: 4,
        clubs: "44 → 40",
        entries: "4 clubs de Serie C et 4 de Serie B",
      },
      {
        key: "first-round",
        windows: [{ from: "2026-08-14", to: "2026-08-17" }],
        fixtures: 16,
        clubs: "40 → 24",
        entries: "16 clubs de Serie B et 12 de Serie A",
      },
      { key: "second-round", windows: [{ from: "2026-09-01", to: "2026-09-15" }], fixtures: 8, clubs: "24 → 16" },
      {
        key: "round-of-16",
        windows: [{ from: "2026-12-02", to: "2026-12-16" }],
        fixtures: 8,
        clubs: "16 → 8",
        entries: "L’Inter, tenante du titre, et les 2e à 8e de Serie A 2025-26",
      },
      { key: "quarterfinals", windows: [{ from: "2027-02-03", to: "2027-02-10" }], fixtures: 4, clubs: "8 → 4" },
      {
        key: "semifinals",
        windows: [
          { from: "2027-03-02", to: "2027-03-03" },
          { from: "2027-04-20", to: "2027-04-21" },
        ],
        twoLegged: true,
        fixtures: 4,
        clubs: "4 → 2",
      },
      {
        key: "final",
        windows: [{ from: "2027-05-19" }],
        fixtures: 1,
        clubs: "2 → 1",
        venue: "Stadio Olimpico, Rome",
        note: "Coup d’envoi à 21 h",
      },
    ],
  },

  "dfb-pokal": {
    season: "2026-27",
    updatedAt: UPDATED_AT,
    espnFrom: "first-round",
    note: "Les tirages ont lieu en général le dimanche soir qui suit chaque tour.",
    sources: [
      { label: "DFB", url: "https://www.dfb.de/news/rahmenterminkalender-fuer-saison-2026/2027-festgelegt" },
      { label: "Wikipédia", url: "https://en.wikipedia.org/wiki/2026%E2%80%9327_DFB-Pokal" },
    ],
    checkedWith: ["ESPN", "OpenLigaDB", "TheSportsDB"],
    rounds: [
      {
        key: "first-round",
        windows: [
          { from: "2026-08-21", to: "2026-08-24" },
          { from: "2026-09-01", to: "2026-09-02" },
        ],
        draw: "6 juin 2026",
        fixtures: 32,
        clubs: "64 → 32",
        entries: "18 clubs de Bundesliga, 18 de 2. Bundesliga, 4 de 3. Liga et 24 représentants régionaux",
      },
      { key: "second-round", windows: [{ from: "2026-10-27", to: "2026-10-28" }], draw: "5 sept. 2026", fixtures: 16, clubs: "32 → 16" },
      { key: "round-of-16", windows: [{ from: "2026-12-01", to: "2026-12-02" }], draw: "1er nov. 2026", fixtures: 8, clubs: "16 → 8" },
      {
        key: "quarterfinals",
        windows: [
          { from: "2027-02-02", to: "2027-02-03" },
          { from: "2027-02-09", to: "2027-02-10" },
        ],
        draw: "6 déc. 2026",
        fixtures: 4,
        clubs: "8 → 4",
        note: "Matchs répartis sur deux semaines",
      },
      { key: "semifinals", windows: [{ from: "2027-04-20", to: "2027-04-21" }], draw: "14 févr. 2027", fixtures: 2, clubs: "4 → 2" },
      { key: "final", windows: [{ from: "2027-05-29" }], fixtures: 1, clubs: "2 → 1", venue: "Olympiastadion, Berlin" },
    ],
  },

  "coupe-de-france": {
    season: "2026-27",
    updatedAt: UPDATED_AT,
    espnFrom: "round-of-64",
    note: "Les deux premiers tours sont organisés par les ligues régionales, à des dates propres à chacune.",
    sources: [
      {
        label: "FFF",
        url: "https://www.fff.fr/article/16601-calendrier-des-competions-seniors-masculines-2026-2027.html",
      },
      { label: "Wikipédia", url: "https://fr.wikipedia.org/wiki/Coupe_de_France_de_football_2026-2027" },
    ],
    checkedWith: ["ESPN (édition 2025-26)"],
    rounds: [
      {
        key: "first-round",
        windows: [{ from: "2026-08-16", to: "2026-08-23" }],
        note: "23 août dans la plupart des ligues, 16 août dans le Grand Est (3 mai en Île-de-France)",
      },
      {
        key: "second-round",
        windows: [{ from: "2026-08-30", to: "2026-09-06" }],
        entries: "Clubs de National 2, une partie des clubs de Régional 1 et Saint-Pierre-et-Miquelon",
        note: "30 août dans la plupart des ligues, 6 sept. en Corse (24 mai en Île-de-France)",
      },
      { key: "third-round", windows: [{ from: "2026-09-12", to: "2026-09-13" }], clubs: "2 338 → 1 169" },
      {
        key: "fourth-round",
        windows: [{ from: "2026-09-26", to: "2026-09-27" }],
        clubs: "1 214 → 602",
        entries: "45 clubs de National 1",
      },
      {
        key: "fifth-round",
        windows: [{ from: "2026-10-10", to: "2026-10-11" }],
        clubs: "620 → 310",
        entries: "18 clubs de Ligue 3",
      },
      { key: "sixth-round", windows: [{ from: "2026-10-24", to: "2026-10-25" }], clubs: "310 → 155" },
      {
        key: "seventh-round",
        windows: [{ from: "2026-11-14", to: "2026-11-15" }],
        clubs: "176 → 88",
        entries: "18 clubs de Ligue 2, Mayotte, Nouvelle-Calédonie et Polynésie",
      },
      {
        key: "eighth-round",
        windows: [{ from: "2026-11-28", to: "2026-11-29" }],
        clubs: "92 → 46",
        entries: "Guadeloupe, Guyane, La Réunion et Martinique",
      },
      {
        key: "round-of-64",
        windows: [{ from: "2026-12-19", to: "2026-12-20" }],
        fixtures: 32,
        clubs: "64 → 32",
        entries: "18 clubs de Ligue 1",
        note: "Tirage en trois groupes géographiques",
      },
      { key: "round-of-32", windows: [{ from: "2027-01-09", to: "2027-01-10" }], fixtures: 16, clubs: "32 → 16" },
      { key: "round-of-16", windows: [{ from: "2027-02-03" }], fixtures: 8, clubs: "16 → 8" },
      { key: "quarterfinals", windows: [{ from: "2027-03-03" }], fixtures: 4, clubs: "8 → 4" },
      { key: "semifinals", windows: [{ from: "2027-04-21" }], fixtures: 2, clubs: "4 → 2" },
      { key: "final", windows: [{ from: "2027-05-15" }], fixtures: 1, clubs: "2 → 1", venue: "Stade de France, Saint-Denis" },
    ],
  },
};

// --- Dates ---

const DAY = 86_400_000;

const offsetFormatter = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, timeZoneName: "shortOffset" });
// Les jours du calendrier sont des dates civiles : on les formate en UTC pour éviter tout décalage.
const dayFormatter = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
const pounds = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "GBP",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
});

function utcDay(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  return Date.UTC(year, month - 1, date);
}

/** Minuit, heure de Paris, pour un jour « AAAA-MM-JJ ». */
function parisMidnight(day: string): number {
  const utc = utcDay(day);
  const offset = offsetFormatter.formatToParts(utc).find((part) => part.type === "timeZoneName")?.value;
  return utc - Number(offset?.match(/GMT([+-]\d+)/)?.[1] ?? 1) * 3_600_000;
}

function dayParts(day: string) {
  const parts = dayFormatter.formatToParts(utcDay(day));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const date = Number(part("day"));
  return { weekday: part("weekday"), day: date === 1 ? "1er" : String(date), month: part("month") };
}

/** « sam. 7 nov. », « 26–27 sept. », « 30 oct. – 2 nov. ». */
function formatWindow({ from, to }: PlayWindow): string {
  const start = dayParts(from);
  if (!to || to === from) return `${start.weekday} ${start.day} ${start.month}`;
  const end = dayParts(to);
  return start.month === end.month
    ? `${start.day}–${end.day} ${start.month}`
    : `${start.day} ${start.month} – ${end.day} ${end.month}`;
}

function formatWindows(windows: PlayWindow[]): string {
  // Au-delà de trois plages (matchs reportés…), la période complète reste plus lisible.
  if (windows.length > 3) {
    const last = windows[windows.length - 1];
    return formatWindow({ from: windows[0].from, to: last.to ?? last.from });
  }
  return windows.map(formatWindow).join(" et ");
}

/** Regroupe des jours de match en plages de jours consécutifs. */
function toWindows(days: string[]): PlayWindow[] {
  const windows: PlayWindow[] = [];
  for (const day of [...new Set(days)].sort()) {
    const last = windows.at(-1);
    if (last && utcDay(day) - utcDay(last.to ?? last.from) === DAY) last.to = day;
    else windows.push({ from: day });
  }
  return windows;
}

function bounds(windows: PlayWindow[]) {
  const last = windows[windows.length - 1];
  return { start: parisMidnight(windows[0].from), end: parisMidnight(last.to ?? last.from) + DAY };
}

// --- Fusion avec ESPN ---

/** Tour tel que décrit par le calendrier du scoreboard ESPN. */
export interface EspnRound {
  key: string;
  label: string;
  dates: string | null;
  start: string;
  end: string;
}

const NO_DETAILS = {
  twoLegged: false,
  draw: null,
  fixtures: null,
  clubs: null,
  entries: null,
  prize: null,
  venue: null,
  note: null,
} as const;

function fromPlanned(round: PlannedRound, days: string[] | undefined): CupRound {
  const played = days?.length ? toWindows(days) : null;
  const planned = bounds(round.windows);
  const actual = played ? bounds(played) : planned;
  return {
    key: round.key,
    label: roundLabel(round.key),
    dates: formatWindows(played ?? round.windows),
    start: new Date(Math.min(planned.start, actual.start)).toISOString(),
    end: new Date(Math.max(planned.end, actual.end)).toISOString(),
    forecast: !played,
    twoLegged: round.twoLegged ?? false,
    draw: round.draw ?? null,
    fixtures: round.fixtures ?? null,
    clubs: round.clubs ?? null,
    entries: round.entries ?? null,
    prize: round.prize
      ? { winner: pounds.format(round.prize[0]), loser: round.prize[1] === null ? null : pounds.format(round.prize[1]) }
      : null,
    venue: round.venue ?? null,
    note: round.note ?? null,
  };
}

function fromEspn(round: EspnRound, days: string[] | undefined): CupRound {
  return {
    ...round,
    ...NO_DETAILS,
    dates: days?.length ? formatWindows(toWindows(days)) : round.dates,
    forecast: false,
  };
}

/**
 * Tours de l'édition : calendrier officiel complété par ESPN.
 * Les jours réels des matchs publiés par ESPN priment sur les dates prévues.
 */
export function buildRounds({
  espn,
  calendar,
  matchDays,
}: {
  espn: EspnRound[];
  calendar?: CupCalendar;
  /** Jours de match (AAAA-MM-JJ) publiés par ESPN, par slug de tour. */
  matchDays: Map<string, string[]>;
}): CupRound[] {
  const plannedKeys = new Set(calendar?.rounds.map((round) => round.key));
  return [
    ...(calendar?.rounds ?? []).map((round) => fromPlanned(round, matchDays.get(round.key))),
    ...espn.filter((round) => !plannedKeys.has(round.key)).map((round) => fromEspn(round, matchDays.get(round.key))),
  ].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

// --- Avancement ---

export type RoundState = "done" | "live" | "next" | "later";

/** Tour en cours, ou prochain tour s'il n'a pas encore commencé. */
export function currentRound(rounds: CupRound[], now: number): { round: CupRound; live: boolean } | null {
  const round = rounds.find((item) => Date.parse(item.end) > now);
  return round ? { round, live: Date.parse(round.start) <= now } : null;
}

export function roundStates(rounds: CupRound[], now: number): RoundState[] {
  const focus = rounds.findIndex((round) => Date.parse(round.end) > now);
  return rounds.map((round, index) => {
    if (focus === -1 || index < focus) return "done";
    if (index > focus) return "later";
    return Date.parse(round.start) <= now ? "live" : "next";
  });
}

/** Nombre de jours (arrondi au supérieur) avant une date ISO. */
export function daysUntil(date: string, now: number): number {
  return Math.ceil((Date.parse(date) - now) / DAY);
}
