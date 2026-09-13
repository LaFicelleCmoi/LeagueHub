export type LeagueSlug = "premier-league" | "la-liga" | "serie-a" | "bundesliga" | "ligue-1";

export interface League {
  slug: LeagueSlug;
  /** Identifiant de la compétition dans l'API ESPN. */
  espnCode: string;
  name: string;
  country: string;
  /** Identifiant du logo sur le CDN d'ESPN. */
  logoId: number;
  /** Couleur d'accent utilisée dans l'interface. */
  accent: string;
}

export const LEAGUES: readonly League[] = [
  { slug: "premier-league", espnCode: "eng.1", name: "Premier League", country: "Angleterre", logoId: 23, accent: "#7c3aed" },
  { slug: "la-liga", espnCode: "esp.1", name: "La Liga", country: "Espagne", logoId: 15, accent: "#ea580c" },
  { slug: "serie-a", espnCode: "ita.1", name: "Serie A", country: "Italie", logoId: 12, accent: "#0284c7" },
  { slug: "bundesliga", espnCode: "ger.1", name: "Bundesliga", country: "Allemagne", logoId: 10, accent: "#dc2626" },
  { slug: "ligue-1", espnCode: "fra.1", name: "Ligue 1", country: "France", logoId: 9, accent: "#16a34a" },
];

export function getLeague(slug: string): League | undefined {
  return LEAGUES.find((league) => league.slug === slug);
}

export function leagueLogo(league: League, variant: "light" | "dark" = "light"): string {
  const folder = variant === "dark" ? "500-dark" : "500";
  return `https://a.espncdn.com/i/leaguelogos/soccer/${folder}/${league.logoId}.png`;
}
