export type TopLeagueSlug = "premier-league" | "la-liga" | "serie-a" | "bundesliga" | "ligue-1";
export type SecondDivisionSlug = "championship" | "segunda-division" | "serie-b" | "2-bundesliga" | "ligue-2";
export type LeagueSlug = TopLeagueSlug | SecondDivisionSlug;

export interface League {
  slug: LeagueSlug;
  /** Niveau du championnat : 1 pour les 5 grands, 2 pour leurs deuxièmes divisions. */
  tier: 1 | 2;
  /** Identifiant de la compétition dans l'API ESPN. */
  espnCode: string;
  name: string;
  country: string;
  /** Identifiant du logo sur le CDN d'ESPN. */
  logoId: number;
  /** ESPN publie une variante pour fond sombre (absente pour certaines deuxièmes divisions). */
  darkLogo: boolean;
  /** Couleur d'accent utilisée dans l'interface. */
  accent: string;
}

export const LEAGUES: readonly (League & { slug: TopLeagueSlug })[] = [
  { slug: "premier-league", tier: 1, espnCode: "eng.1", name: "Premier League", country: "Angleterre", logoId: 23, darkLogo: true, accent: "#7c3aed" },
  { slug: "la-liga", tier: 1, espnCode: "esp.1", name: "La Liga", country: "Espagne", logoId: 15, darkLogo: true, accent: "#ea580c" },
  { slug: "serie-a", tier: 1, espnCode: "ita.1", name: "Serie A", country: "Italie", logoId: 12, darkLogo: true, accent: "#0284c7" },
  { slug: "bundesliga", tier: 1, espnCode: "ger.1", name: "Bundesliga", country: "Allemagne", logoId: 10, darkLogo: true, accent: "#dc2626" },
  { slug: "ligue-1", tier: 1, espnCode: "fra.1", name: "Ligue 1", country: "France", logoId: 9, darkLogo: true, accent: "#16a34a" },
];

export const SECOND_DIVISIONS: readonly (League & { slug: SecondDivisionSlug })[] = [
  { slug: "championship", tier: 2, espnCode: "eng.2", name: "Championship", country: "Angleterre", logoId: 24, darkLogo: true, accent: "#1d4ed8" },
  { slug: "segunda-division", tier: 2, espnCode: "esp.2", name: "Segunda División", country: "Espagne", logoId: 107, darkLogo: true, accent: "#c026d3" },
  { slug: "serie-b", tier: 2, espnCode: "ita.2", name: "Serie B", country: "Italie", logoId: 99, darkLogo: false, accent: "#65a30d" },
  { slug: "2-bundesliga", tier: 2, espnCode: "ger.2", name: "2. Bundesliga", country: "Allemagne", logoId: 97, darkLogo: false, accent: "#e11d48" },
  { slug: "ligue-2", tier: 2, espnCode: "fra.2", name: "Ligue 2", country: "France", logoId: 96, darkLogo: true, accent: "#0d9488" },
];

/** Tous les championnats du site : chacun a ses pages classement, matchs, buteurs et actualités. */
export const ALL_LEAGUES: readonly League[] = [...LEAGUES, ...SECOND_DIVISIONS];

/** Page d'accueil des deuxièmes divisions. */
export const SECOND_DIVISIONS_HREF = "/deuxiemes-divisions";

export function getLeague(slug: string): League | undefined {
  return ALL_LEAGUES.find((league) => league.slug === slug);
}

export function leagueLogo(league: League, variant: "light" | "dark" = "light"): string {
  const folder = variant === "dark" && league.darkLogo ? "500-dark" : "500";
  return `https://a.espncdn.com/i/leaguelogos/soccer/${folder}/${league.logoId}.png`;
}
