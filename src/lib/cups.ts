import type { LeagueSlug } from "./leagues";

// Les 5 grandes coupes nationales, une par pays des championnats suivis.

export type CupSlug = "fa-cup" | "copa-del-rey" | "coppa-italia" | "dfb-pokal" | "coupe-de-france";

export interface Cup {
  slug: CupSlug;
  /** Identifiant de la compétition dans l'API ESPN. */
  espnCode: string;
  name: string;
  country: string;
  /** Première division du même pays : sert à repérer les exploits des petits poucets. */
  league: LeagueSlug;
  /** Identifiant du logo sur le CDN d'ESPN. */
  logoId: number;
  /** ESPN ne publie pas de variante sombre pour tous les logos. */
  darkLogo: boolean;
  accent: string;
}

export const CUPS: readonly Cup[] = [
  { slug: "fa-cup", espnCode: "eng.fa", name: "FA Cup", country: "Angleterre", league: "premier-league", logoId: 40, darkLogo: true, accent: "#1d4ed8" },
  { slug: "copa-del-rey", espnCode: "esp.copa_del_rey", name: "Copa del Rey", country: "Espagne", league: "la-liga", logoId: 80, darkLogo: true, accent: "#c2410c" },
  { slug: "coppa-italia", espnCode: "ita.coppa_italia", name: "Coppa Italia", country: "Italie", league: "serie-a", logoId: 2192, darkLogo: false, accent: "#15803d" },
  { slug: "dfb-pokal", espnCode: "ger.dfb_pokal", name: "DFB-Pokal", country: "Allemagne", league: "bundesliga", logoId: 2061, darkLogo: true, accent: "#a16207" },
  { slug: "coupe-de-france", espnCode: "fra.coupe_de_france", name: "Coupe de France", country: "France", league: "ligue-1", logoId: 182, darkLogo: true, accent: "#be123c" },
];

export function getCup(slug: string): Cup | undefined {
  return CUPS.find((cup) => cup.slug === slug);
}

export function cupLogo(cup: Cup, variant: "light" | "dark" = "light"): string {
  const folder = variant === "dark" ? "500-dark" : "500";
  return `https://a.espncdn.com/i/leaguelogos/soccer/${folder}/${cup.logoId}.png`;
}

const ROUND_LABELS: Record<string, string> = {
  // Tours de qualification (FA Cup) : jamais publiés par ESPN, repris du calendrier officiel.
  "extra-preliminary-round": "Tour extra-préliminaire",
  "preliminary-round": "Tour préliminaire",
  "qualifying-round": "Tour de qualification",
  "first-qualifying-round": "1er tour de qualification",
  "second-qualifying-round": "2e tour de qualification",
  "third-qualifying-round": "3e tour de qualification",
  "fourth-qualifying-round": "4e tour de qualification",
  "first-round": "1er tour",
  "second-round": "2e tour",
  "third-round": "3e tour",
  "fourth-round": "4e tour",
  "fifth-round": "5e tour",
  "sixth-round": "6e tour",
  "seventh-round": "7e tour",
  "eighth-round": "8e tour",
  "round-of-128": "64es de finale",
  "round-of-64": "32es de finale",
  "round-of-32": "16es de finale",
  "round-of-16": "8es de finale",
  quarterfinals: "Quarts de finale",
  semifinals: "Demi-finales",
  final: "Finale",
};

/** Slug commun d'un tour : « Rd of 16 », « Round of 16 » et « round-of-16 » donnent « round-of-16 ». */
export function roundKey(slugOrLabel: string): string {
  return slugOrLabel
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^rd-of-/, "round-of-")
    .replace(/^(quarter|semi)-finals$/, "$1finals");
}

/** Nom français d'un tour, à partir du slug (« second-round ») ou du libellé ESPN (« Second Round »). */
export function roundLabel(slugOrLabel: string): string {
  return ROUND_LABELS[roundKey(slugOrLabel)] ?? slugOrLabel.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** « Match aller » / « Match retour » à partir des notes ESPN (« 1st Leg », « 2nd Leg »). */
export function legLabel(notes?: { headline?: string; text?: string }[]): string | null {
  const text = (notes ?? []).map((note) => note.headline ?? note.text ?? "").join(" ");
  if (/1st leg/i.test(text)) return "Match aller";
  if (/2nd leg/i.test(text)) return "Match retour";
  return null;
}

const MONTHS: Record<string, string> = {
  Jan: "janv.",
  Feb: "févr.",
  Mar: "mars",
  Apr: "avr.",
  May: "mai",
  Jun: "juin",
  Jul: "juil.",
  Aug: "août",
  Sep: "sept.",
  Oct: "oct.",
  Nov: "nov.",
  Dec: "déc.",
};

/** Traduit les dates d'un tour : « Aug 21-Sep 2 » → « 21 août – 2 sept. », « Dec 5-8 » → « 5–8 déc. ». */
export function frenchDateRange(detail?: string): string | null {
  const match = detail?.trim().match(/^([A-Z][a-z]{2}) (\d{1,2})(?:-(?:([A-Z][a-z]{2}) )?(\d{1,2}))?$/);
  if (!match) return null;
  const [, startMonth, startDay, endMonth, endDay] = match;
  const month = (name: string) => MONTHS[name] ?? name;
  if (!endDay) return `${startDay} ${month(startMonth)}`;
  if (!endMonth || endMonth === startMonth) return `${startDay}–${endDay} ${month(startMonth)}`;
  return `${startDay} ${month(startMonth)} – ${endDay} ${month(endMonth)}`;
}
