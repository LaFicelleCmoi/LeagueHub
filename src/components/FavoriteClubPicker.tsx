"use client";

import { useState, type CSSProperties } from "react";
import { ChevronRight, Star } from "lucide-react";
import type { ClubIndexEntry } from "@/lib/clubs";
import { useFavoriteClub } from "@/lib/favorite-club";
import { getLeague } from "@/lib/leagues";
import { FavoriteClubDialog } from "./FavoriteClubDialog";
import { TeamLogo } from "./TeamLogo";

// Choix du club favori (badge LeagueHub, « Mon club »), mémorisé dans le navigateur.
export function FavoriteClubPicker({ clubs }: { clubs: ClubIndexEntry[] }) {
  const favorite = useFavoriteClub();
  const [open, setOpen] = useState(false);
  const entry = favorite ? clubs.find((club) => club.id === favorite.team.id && club.league === favorite.league) : undefined;
  const league = favorite ? getLeague(favorite.league) : undefined;
  const color = entry?.color ?? league?.accent ?? "#f59e0b";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        style={{ "--club": color } as CSSProperties}
        className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-500/40"
      >
        {favorite && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,color-mix(in_srgb,var(--club)_18%,transparent),transparent_65%)]"
          />
        )}
        <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30">
          {favorite ? <TeamLogo team={favorite.team} size={30} /> : <Star className="size-5 fill-amber-400 text-amber-500" aria-hidden />}
        </span>
        <span className="relative min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">Mon club</span>
          <span className="block truncate font-semibold">{favorite ? favorite.team.name : "Choisir mon club"}</span>
          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
            {favorite ? `${league?.name ?? ""} · changer` : "Il s’affichera sur votre pass et en avant sur le site"}
          </span>
        </span>
        <ChevronRight className="relative size-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </button>

      {open && <FavoriteClubDialog clubs={clubs} onClose={() => setOpen(false)} />}
    </>
  );
}
