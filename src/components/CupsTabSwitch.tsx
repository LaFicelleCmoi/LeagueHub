"use client";

import { useSyncExternalStore } from "react";
import { Trophy } from "lucide-react";
import { setCupsTab, useCupsTab } from "@/lib/cups-tab";

const noopSubscribe = () => () => {};

function Track({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors motion-reduce:transition-none ${
        on ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
      }`}
    >
      <span
        className={`inline-block size-4 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${
          on ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </span>
  );
}

/** Interrupteur qui affiche ou masque l'onglet « Coupes nationales » dans le menu. */
export function CupsTabSwitch({ variant = "compact" }: { variant?: "compact" | "row" }) {
  const on = useCupsTab();
  const toggle = () => setCupsTab(!on);

  if (variant === "row") {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggle}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <span className="grid size-6 place-items-center">
          <Trophy className="size-5 text-amber-500" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          Onglet Coupes nationales
          <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
            FA Cup, Copa del Rey, Coppa Italia, DFB-Pokal, Coupe de France
          </span>
        </span>
        <Track on={on} />
      </button>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={toggle}
      title={on ? "Masquer l’onglet Coupes" : "Afficher l’onglet Coupes nationales"}
      className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <Trophy className={`size-4 ${on ? "text-amber-500" : ""}`} aria-hidden />
      <span>
        <span className="sr-only">Onglet </span>Coupes<span className="sr-only"> nationales</span>
      </span>
      <Track on={on} />
    </button>
  );
}

/** Rappel sur les pages Coupes quand l'onglet est masqué dans le menu. */
export function CupsTabNotice() {
  const on = useCupsTab();
  // Rien avant l'hydratation : le serveur ne connaît pas le choix du visiteur.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!hydrated || on) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <p>L’onglet Coupes est masqué dans le menu. Activez-le pour y revenir en un clic.</p>
      <CupsTabSwitch />
    </div>
  );
}
