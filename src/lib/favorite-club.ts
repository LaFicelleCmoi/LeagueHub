import { useMemo, useSyncExternalStore } from "react";
import { getLeague } from "./leagues";
import type { ClubRef } from "./types";

// Clubs favoris du visiteur, mémorisés dans son navigateur (aucun compte nécessaire) : un parmi
// les 5 grands championnats (D1), un autre parmi les deuxièmes divisions (D2). Les deux espaces
// du site restent ainsi séparés.

export type Division = 1 | 2;

/** Division d'un championnat (1 par défaut pour un slug inconnu). */
export function divisionOf(league: string): Division {
  return getLeague(league)?.tier ?? 1;
}

// La clé historique reste celle de la D1 : les favoris déjà choisis sont conservés.
const STORAGE_KEYS: Record<Division, string> = { 1: "leaguehub:club-favori:v1", 2: "leaguehub:club-favori-d2:v1" };
const CHANGE_EVENT = "leaguehub:club-favori";

// Repli en mémoire si le stockage est indisponible (navigation privée stricte…).
const memoryRaw: Record<Division, string | null> = { 1: null, 2: null };
const cache: Record<Division, { raw: string | null; club: ClubRef | null }> = {
  1: { raw: null, club: null },
  2: { raw: null, club: null },
};

function readRaw(division: Division): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEYS[division]);
  } catch {
    return memoryRaw[division];
  }
}

/** Relit la valeur stockée en vérifiant sa forme : elle vient du navigateur, pas du serveur. */
function parse(raw: string | null, division: Division): ClubRef | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ClubRef>;
    const team = value.team;
    if (!team || typeof team.id !== "string" || typeof team.name !== "string") return null;
    if (typeof value.league !== "string" || getLeague(value.league)?.tier !== division) return null;
    return {
      league: value.league,
      team: {
        id: team.id,
        name: team.name,
        shortName: typeof team.shortName === "string" ? team.shortName : team.name,
        abbreviation: typeof team.abbreviation === "string" ? team.abbreviation : team.name.slice(0, 3).toUpperCase(),
        logo: typeof team.logo === "string" && team.logo.startsWith("https://a.espncdn.com/") ? team.logo : null,
      },
    };
  } catch {
    return null;
  }
}

function getSnapshot(division: Division): ClubRef | null {
  const raw = readRaw(division);
  const entry = cache[division];
  if (raw !== entry.raw) {
    entry.raw = raw;
    entry.club = parse(raw, division);
  }
  return entry.club;
}

// Fonctions stables pour useSyncExternalStore.
const SNAPSHOTS: Record<Division, () => ClubRef | null> = { 1: () => getSnapshot(1), 2: () => getSnapshot(2) };
const serverSnapshot = () => null;

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Club favori d'une division, partagé par tous les composants de la page (et les autres onglets). */
export function useFavoriteClub(division: Division = 1): ClubRef | null {
  return useSyncExternalStore(subscribe, SNAPSHOTS[division], serverSnapshot);
}

/** Identifiants des clubs favoris des deux divisions : pour les vues qui mêlent les compétitions. */
export function useFavoriteTeamIds(): ReadonlySet<string> {
  const first = useFavoriteClub(1)?.team.id;
  const second = useFavoriteClub(2)?.team.id;
  return useMemo(() => new Set([first, second].filter((id): id is string => Boolean(id))), [first, second]);
}

export function setFavoriteClub(division: Division, club: ClubRef | null) {
  const key = STORAGE_KEYS[division];
  const raw = club ? JSON.stringify({ team: club.team, league: club.league }) : null;
  memoryRaw[division] = raw;
  try {
    if (raw) window.localStorage.setItem(key, raw);
    else window.localStorage.removeItem(key);
  } catch {
    // Stockage indisponible : le choix reste valable jusqu'au rechargement de la page.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Ce club est-il l'un des favoris du visiteur ? */
export function useIsFavorite(teamId: string): boolean {
  return useFavoriteTeamIds().has(teamId);
}
