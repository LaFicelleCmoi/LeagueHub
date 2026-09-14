import { useSyncExternalStore } from "react";

// Affichage de l'onglet « Coupes » dans le menu, mémorisé dans le navigateur.

const STORAGE_KEY = "leaguehub:onglet-coupes:v1";
const CHANGE_EVENT = "leaguehub:onglet-coupes";

// Repli en mémoire si le stockage est indisponible.
let memoryValue = false;

function getSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return memoryValue;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** L'onglet Coupes est-il activé ? (toujours faux côté serveur) */
export function useCupsTab(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function setCupsTab(enabled: boolean) {
  memoryValue = enabled;
  try {
    if (enabled) window.localStorage.setItem(STORAGE_KEY, "1");
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Stockage indisponible : le choix reste valable jusqu'au rechargement de la page.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
