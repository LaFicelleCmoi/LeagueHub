"use client";

import { Star, X } from "lucide-react";
import { setFavoriteClub, useFavoriteClub } from "@/lib/favorite-club";
import { LEAGUES } from "@/lib/leagues";
import type { ClubRef } from "@/lib/types";

// Choix du club affiché sur le badge LeagueHub, mémorisé dans le navigateur.
export function FavoriteClubPicker({ clubs }: { clubs: ClubRef[] }) {
  const favorite = useFavoriteClub();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <label
        htmlFor="favorite-club"
        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"
      >
        <Star className="size-3.5 fill-amber-400 text-amber-500" aria-hidden />
        Club favori sur mon pass
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <select
          id="favorite-club"
          value={favorite?.team.id ?? ""}
          onChange={(event) => setFavoriteClub(clubs.find((club) => club.team.id === event.target.value) ?? null)}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Aucun (pass LeagueHub)</option>
          {LEAGUES.map((league) => {
            const options = clubs
              .filter((club) => club.league === league.slug)
              .sort((a, b) => a.team.name.localeCompare(b.team.name, "fr"));
            return (
              options.length > 0 && (
                <optgroup key={league.slug} label={league.name}>
                  {options.map((club) => (
                    <option key={club.team.id} value={club.team.id}>
                      {club.team.name}
                    </option>
                  ))}
                </optgroup>
              )
            );
          })}
        </select>
        {favorite && (
          <button
            type="button"
            onClick={() => setFavoriteClub(null)}
            aria-label="Retirer le club favori"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
