"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Star } from "lucide-react";
import { useIsFavorite } from "@/lib/favorite-club";
import type { ClubRef } from "@/lib/types";
import { ClubDialog } from "./ClubDialog";

// Une seule fenêtre « 5 derniers matchs » par page, ouvrable depuis n'importe quel club
// (bandeau, cartes de classement, tableau complet).

const OpenClubContext = createContext<((club: ClubRef) => void) | null>(null);

export function ClubDialogProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<ClubRef | null>(null);

  return (
    <OpenClubContext.Provider value={setSelected}>
      {children}
      <ClubDialog club={selected} onClose={() => setSelected(null)} />
    </OpenClubContext.Provider>
  );
}

/** Ouvre la fenêtre d'un club (null hors d'un ClubDialogProvider). */
export function useOpenClub(): ((club: ClubRef) => void) | null {
  return useContext(OpenClubContext);
}

/**
 * Nom (et logo) d'un club, cliquable pour afficher ses 5 derniers matchs.
 * Le club favori reçoit une étoile et l'attribut `data-favorite`, que les lignes de tableau
 * rendues côté serveur utilisent pour se teinter (`has-[[data-favorite]]`).
 */
export function ClubButton({ club, className = "", children }: { club: ClubRef; className?: string; children: ReactNode }) {
  const openClub = useOpenClub();
  const favorite = useIsFavorite(club.team.id);

  return (
    <button
      type="button"
      data-favorite={favorite || undefined}
      onClick={(event) => {
        // Évite une seconde ouverture quand la ligne entière est aussi cliquable.
        event.stopPropagation();
        openClub?.(club);
      }}
      aria-label={`${club.team.name}${favorite ? " (club favori)" : ""} : voir les 5 derniers matchs`}
      className={`rounded-md text-left decoration-slate-400 underline-offset-4 outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-slate-900 dark:decoration-slate-500 dark:focus-visible:outline-white ${className}`}
    >
      {children}
      {favorite && <Star aria-hidden className="size-3.5 shrink-0 fill-amber-400 text-amber-500" />}
    </button>
  );
}
