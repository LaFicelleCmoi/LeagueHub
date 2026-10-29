"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { DEFAULT_THEME, getTheme, setTheme, subscribeToTheme, type Theme } from "@/lib/theme";

// Trois positions plutôt que deux : sombre par défaut, clair, ou le réglage de l'appareil.
const CYCLE: Record<Theme, Theme> = { dark: "light", light: "system", system: "dark" };
const LABELS: Record<Theme, string> = { system: "système", light: "clair", dark: "sombre" };
const ICONS: Record<Theme, LucideIcon> = { system: Monitor, light: Sun, dark: Moon };

export function ThemeToggle({ variant }: { variant?: "row" }) {
  // Thème par défaut côté serveur : le choix du visiteur n'est connu que dans le navigateur.
  const theme = useSyncExternalStore(subscribeToTheme, getTheme, () => DEFAULT_THEME);
  const next = CYCLE[theme];
  const Icon = ICONS[theme];
  const label = `Thème ${LABELS[theme]}`;
  const action = `passer au thème ${LABELS[next]}`;

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <span className="grid size-6 place-items-center">
          <Icon className="size-5" aria-hidden />
        </span>
        <span>{label}</span>
        <span className="ml-auto text-sm font-normal text-slate-500 dark:text-slate-400">{`Passer au ${LABELS[next]}`}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={`${label} · ${action}`}
      className="grid size-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
    >
      <Icon className="size-5" aria-hidden />
      <span className="sr-only">{`${label} : ${action}`}</span>
    </button>
  );
}
