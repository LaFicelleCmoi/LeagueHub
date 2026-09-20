// Thème du site, mémorisé dans le navigateur (aucun compte nécessaire).
// « système » suit le réglage de l'appareil, et le reste des composants n'a rien à savoir :
// la classe posée sur <html> commande la variante « dark: » de Tailwind (voir globals.css).
//
// Aucun hook ici : le module est aussi importé par le layout, qui s'exécute sur le serveur.

export type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "leaguehub:theme:v1";
const CHANGE_EVENT = "leaguehub:theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

// Repli en mémoire si le stockage est indisponible (navigation privée stricte…).
let memoryValue: Theme = "system";

function parse(raw: string | null): Theme {
  return raw === "light" || raw === "dark" ? raw : "system";
}

/** Thème choisi, relu à la source : le visiteur a pu en changer dans un autre onglet. */
export function getTheme(): Theme {
  try {
    return parse(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return memoryValue;
  }
}

/** Le thème s'applique à <html> : tout le site en dépend, pas seulement le sélecteur. */
function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia(DARK_QUERY).matches);
  document.documentElement.classList.toggle("dark", dark);
}

/** S'abonne aux changements de thème, y compris celui du système et des autres onglets. */
export function subscribeToTheme(onChange: () => void) {
  // Le réglage du système peut changer pendant la visite (coucher du soleil, bascule manuelle).
  const media = window.matchMedia(DARK_QUERY);
  const onSystemChange = () => {
    apply(getTheme());
    onChange();
  };
  media.addEventListener("change", onSystemChange);
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function setTheme(theme: Theme) {
  memoryValue = theme;
  try {
    if (theme === "system") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Stockage indisponible : le choix reste valable jusqu'au rechargement de la page.
  }
  apply(theme);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * Exécuté dans <head> avant la première peinture : sans lui, une page réglée en sombre
 * s'afficherait en clair le temps que React démarre.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});if(t==="dark"||(t!=="light"&&matchMedia(${JSON.stringify(DARK_QUERY)}).matches))document.documentElement.classList.add("dark")}catch(e){}`;
