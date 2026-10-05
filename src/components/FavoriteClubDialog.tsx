"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Search, Star, X } from "lucide-react";
import type { ClubIndexEntry } from "@/lib/clubs";
import { setFavoriteClub, useFavoriteClub } from "@/lib/favorite-club";
import { getLeague, LEAGUES, type LeagueSlug } from "@/lib/leagues";
import { LeagueLogo } from "./LeagueLogo";
import { TeamLogo } from "./TeamLogo";

/** Minuscules sans accents : « Atlético » se trouve en tapant « atletico ». */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function ClubCard({
  club,
  selected,
  showLeague,
  onPick,
}: {
  club: ClubIndexEntry;
  selected: boolean;
  showLeague: boolean;
  onPick: (club: ClubIndexEntry) => void;
}) {
  const league = getLeague(club.league);
  const color = club.color ?? league?.accent ?? "#64748b";

  return (
    <button
      type="button"
      onClick={() => onPick(club)}
      aria-pressed={selected}
      style={{ "--club": color } as CSSProperties}
      className={`group relative flex min-w-0 items-center gap-3 overflow-hidden rounded-xl border px-3.5 py-3 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
        selected
          ? "border-amber-400 bg-amber-50 ring-1 ring-amber-400 dark:bg-amber-500/10"
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
      }`}
    >
      {/* Teinte du club, en fond : rappelle ses couleurs sans gêner la lecture. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,color-mix(in_srgb,var(--club)_22%,transparent),transparent_65%)] opacity-80 transition-opacity group-hover:opacity-100"
      />
      <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-white/90 shadow-sm ring-1 ring-black/5 dark:bg-slate-950/40 dark:ring-white/10">
        <TeamLogo team={club} size={30} />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block truncate font-semibold">{club.name}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          {showLeague && league ? (
            <>
              <LeagueLogo league={league} size={12} />
              {league.name}
            </>
          ) : (
            club.abbreviation
          )}
        </span>
      </span>
      {selected && (
        <>
          <Star aria-hidden className="relative size-4 shrink-0 fill-amber-400 text-amber-500" />
          <span className="sr-only">(club favori actuel)</span>
        </>
      )}
    </button>
  );
}

// Fenêtre « Mon club » : onglets par championnat, recherche et grille des clubs à leurs couleurs.
export function FavoriteClubDialog({ clubs, onClose }: { clubs: ClubIndexEntry[]; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const favorite = useFavoriteClub();
  const [tab, setTab] = useState<LeagueSlug>(favorite?.league ?? LEAGUES[0].slug);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    searchRef.current?.focus();
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  const counts = useMemo(
    () => Object.fromEntries(LEAGUES.map((league) => [league.slug, clubs.filter((club) => club.league === league.slug).length])),
    [clubs],
  );

  const needle = normalize(query);
  const searching = needle.length > 0;
  const visible = useMemo(() => {
    const list = searching
      ? clubs.filter((club) => [club.name, club.shortName, club.abbreviation].some((field) => normalize(field).includes(needle)))
      : clubs.filter((club) => club.league === tab);
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [clubs, needle, searching, tab]);

  const close = () => dialogRef.current?.close();
  const pick = (club: ClubIndexEntry) => {
    setFavoriteClub({
      league: club.league,
      team: { id: club.id, name: club.name, shortName: club.shortName, abbreviation: club.abbreviation, logo: club.logo },
    });
    close();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      aria-labelledby="favorite-dialog-title"
      className="m-auto flex max-h-[min(92dvh,52rem)] w-[min(calc(100%-1rem),56rem)] flex-col overflow-hidden rounded-2xl bg-slate-50 p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm dark:bg-slate-950 dark:text-slate-100"
    >
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
            <Star className="size-3.5 fill-current" aria-hidden />
            Mon club
          </p>
          <h2 id="favorite-dialog-title" className="mt-1 text-xl font-black uppercase tracking-tight sm:text-2xl">
            Choisir mon club
          </h2>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Fermer"
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <X className="size-5" aria-hidden />
        </button>
      </header>

      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-3 lg:flex-row lg:items-center dark:border-slate-800 dark:bg-slate-900">
        <div
          role="tablist"
          aria-label="Championnats"
          className="-mx-1 flex shrink-0 gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950/60"
        >
          {LEAGUES.map((league) => {
            const active = !searching && tab === league.slug;
            return (
              <button
                key={league.slug}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setTab(league.slug);
                  setQuery("");
                }}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-white dark:ring-slate-700"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <LeagueLogo league={league} size={16} />
                <span className="hidden sm:inline">{league.name}</span>
                <span className="text-xs font-medium tabular-nums text-slate-400">{counts[league.slug]}</span>
              </button>
            );
          })}
        </div>
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus-within:border-slate-400 dark:border-slate-800 dark:bg-slate-950/60 dark:focus-within:border-slate-600">
          <Search className="size-4 shrink-0 text-slate-400" aria-hidden />
          <span className="sr-only">Rechercher un club</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un club…"
            className="w-full min-w-0 bg-transparent outline-none placeholder:text-slate-400 [&::-webkit-search-cancel-button]:hidden"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {searching && (
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
            {visible.length} {visible.length > 1 ? "clubs trouvés" : visible.length === 1 ? "club trouvé" : "club trouvé"}
          </p>
        )}
        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Aucun club ne correspond à « {query} ».
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((club) => (
              <ClubCard
                key={`${club.league}-${club.id}`}
                club={club}
                selected={favorite?.team.id === club.id}
                showLeague={searching}
                onPick={pick}
              />
            ))}
          </div>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-slate-500 dark:text-slate-400">
          {favorite ? (
            <>
              Club actuel : <span className="font-semibold text-slate-900 dark:text-white">{favorite.team.name}</span>
            </>
          ) : (
            "Votre club apparaît sur le pass, dans « Mon club » et en avant sur tout le site."
          )}
        </p>
        {favorite && (
          <button
            type="button"
            onClick={() => {
              setFavoriteClub(null);
              close();
            }}
            className="rounded-lg px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            Retirer mon club
          </button>
        )}
      </footer>
    </dialog>
  );
}
