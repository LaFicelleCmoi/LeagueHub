"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Settings2 } from "lucide-react";
import { CupsTabSwitch } from "./CupsTabSwitch";
import { ThemeToggle } from "./ThemeToggle";

// Réglages de l'en-tête (onglet Coupes, thème) regroupés derrière une seule icône :
// la barre de navigation garde la place pour les rubriques.
export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={boxRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Réglages"
        title="Réglages"
        className={`grid size-10 place-items-center rounded-lg transition-colors ${
          open
            ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        }`}
      >
        <Settings2 className="size-5" aria-hidden />
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Affichage</p>
          <CupsTabSwitch variant="row" />
          <ThemeToggle variant="row" />
        </div>
      )}
    </div>
  );
}
