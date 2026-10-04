import { CUPS, cupLogo, type CupSlug } from "./cups";
import { LEAGUES, leagueLogo, type LeagueSlug } from "./leagues";

// Toutes les compétitions suivies par la page « Direct » : coupes d'Europe, championnats,
// coupes nationales.

export type EuropeanSlug = "ligue-des-champions" | "ligue-europa" | "ligue-conference";

export interface EuropeanCompetition {
  slug: EuropeanSlug;
  espnCode: string;
  name: string;
  /** Identifiant du logo sur le CDN d'ESPN. */
  logoId: number;
  accent: string;
}

export const EUROPEAN_COMPETITIONS: readonly EuropeanCompetition[] = [
  { slug: "ligue-des-champions", espnCode: "uefa.champions", name: "Ligue des champions", logoId: 2, accent: "#1e1b4b" },
  { slug: "ligue-europa", espnCode: "uefa.europa", name: "Ligue Europa", logoId: 2310, accent: "#ea580c" },
  { slug: "ligue-conference", espnCode: "uefa.europa.conf", name: "Ligue Conférence", logoId: 20296, accent: "#0f766e" },
];

export function getEuropeanCompetition(slug: string): EuropeanCompetition | undefined {
  return EUROPEAN_COMPETITIONS.find((competition) => competition.slug === slug);
}

export type DirectSlug = LeagueSlug | CupSlug | EuropeanSlug;
export type DirectKind = "europe" | "league" | "cup";

export interface DirectCompetition {
  slug: DirectSlug;
  kind: DirectKind;
  espnCode: string;
  name: string;
  /** Pays ou organisateur, affiché sous le nom. */
  subtitle: string;
  logo: string;
  /** Variante pour fond sombre, quand ESPN en publie une. */
  darkLogo: string | null;
  accent: string;
  /** Page du site consacrée à la compétition. */
  href: string | null;
}

const uefaLogo = (id: number, folder = "500") => `https://a.espncdn.com/i/leaguelogos/soccer/${folder}/${id}.png`;

/** Ordre d'affichage : coupes d'Europe, championnats, coupes nationales. */
export const DIRECT_COMPETITIONS: readonly DirectCompetition[] = [
  ...EUROPEAN_COMPETITIONS.map((competition) => ({
    slug: competition.slug,
    kind: "europe" as const,
    espnCode: competition.espnCode,
    name: competition.name,
    subtitle: "UEFA",
    logo: uefaLogo(competition.logoId),
    darkLogo: uefaLogo(competition.logoId, "500-dark"),
    accent: competition.accent,
    href: null,
  })),
  ...LEAGUES.map((league) => ({
    slug: league.slug,
    kind: "league" as const,
    espnCode: league.espnCode,
    name: league.name,
    subtitle: league.country,
    logo: leagueLogo(league),
    darkLogo: leagueLogo(league, "dark"),
    accent: league.accent,
    href: `/${league.slug}/matchs`,
  })),
  ...CUPS.map((cup) => ({
    slug: cup.slug,
    kind: "cup" as const,
    espnCode: cup.espnCode,
    name: cup.name,
    subtitle: cup.country,
    logo: cupLogo(cup),
    darkLogo: cup.darkLogo ? cupLogo(cup, "dark") : null,
    accent: cup.accent,
    href: `/coupes/${cup.slug}`,
  })),
];
