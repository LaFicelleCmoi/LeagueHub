import { useSyncExternalStore } from "react";

// Horloge partagée des comptes à rebours : un seul minuteur pour toute la page,
// calé sur les changements de seconde et suspendu quand l'onglet est masqué.

/** Le compte à rebours s'affiche dans les 3 jours qui précèdent le coup d'envoi. */
export const COUNTDOWN_WINDOW = 3 * 24 * 60 * 60_000;

const listeners = new Set<() => void>();
let now = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

function schedule() {
  clearTimeout(timer);
  if (document.visibilityState !== "visible") return;
  // Quelques millisecondes de marge pour tomber juste après le changement de seconde.
  timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
}

function tick() {
  now = Date.now();
  for (const listener of listeners) listener();
  schedule();
}

function onVisibilityChange() {
  if (document.visibilityState === "visible") tick();
  else clearTimeout(timer);
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    now = Date.now();
    document.addEventListener("visibilitychange", onVisibilityChange);
    schedule();
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
  };
}

/** Heure courante actualisée chaque seconde ; 0 côté serveur et avant l'hydratation. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, () => now, () => 0);
}
