import { useSyncExternalStore } from "react";
import { getLeague } from "./leagues";
import type { ClubRef } from "./types";

// Club favori du visiteur, mémorisé dans son navigateur (aucun compte nécessaire).

const STORAGE_KEY = "leaguehub:club-favori:v1";
const CHANGE_EVENT = "leaguehub:club-favori";

// Repli en mémoire si le stockage est indisponible (navigation privée stricte…).
let memoryRaw: string | null = null;
let cachedRaw: string | null = null;
let cachedClub: ClubRef | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return memoryRaw;
  }
}

/** Relit la valeur stockée en vérifiant sa forme : elle vient du navigateur, pas du serveur. */
function parse(raw: string | null): ClubRef | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ClubRef>;
    const team = value.team;
    if (!team || typeof team.id !== "string" || typeof team.name !== "string") return null;
    if (typeof value.league !== "string" || !getLeague(value.league)) return null;
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

function getSnapshot(): ClubRef | null {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedClub = parse(raw);
  }
  return cachedClub;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Club favori actuel, partagé par tous les composants de la page (et les autres onglets). */
export function useFavoriteClub(): ClubRef | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function setFavoriteClub(club: ClubRef | null) {
  const raw = club ? JSON.stringify({ team: club.team, league: club.league }) : null;
  memoryRaw = raw;
  try {
    if (raw) window.localStorage.setItem(STORAGE_KEY, raw);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Stockage indisponible : le choix reste valable jusqu'au rechargement de la page.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Ce club est-il le favori du visiteur ? */
export function useIsFavorite(teamId: string): boolean {
  return useFavoriteClub()?.team.id === teamId;
}
