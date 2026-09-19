"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { ClubIndexEntry } from "@/lib/clubs";
import { getLeague } from "@/lib/leagues";
import { LeagueLogo } from "./LeagueLogo";
import { TeamLogo } from "./TeamLogo";

const MAX_RESULTS = 8;

/** Minuscules sans accents ni ponctuation : « Atlético » se trouve en tapant « atletico ». */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function score(club: ClubIndexEntry, query: string): number {
  const fields = [club.name, club.shortName, club.abbreviation].map(normalize);
  if (fields.some((field) => field === query)) return 0;
  if (fields.some((field) => field.startsWith(query))) return 1;
  if (fields.some((field) => field.split(" ").some((word) => word.startsWith(query)))) return 2;
  if (fields.some((field) => field.includes(query))) return 3;
  return -1;
}

// Barre de recherche des clubs : mène à la page d'un club (saison en cours et palmarès).
export function ClubSearch({ clubs, onNavigate }: { clubs: ClubIndexEntry[]; onNavigate?: () => void }) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const needle = normalize(query);
    if (needle.length < 2) return [];
    return clubs
      .map((club) => ({ club, rank: score(club, needle) }))
      .filter((item) => item.rank >= 0)
      .sort((a, b) => a.rank - b.rank || a.club.name.localeCompare(b.club.name, "fr"))
      .slice(0, MAX_RESULTS)
      .map((item) => item.club);
  }, [clubs, query]);

  // Raccourci « / » : la recherche prend le focus, sauf si on écrit déjà quelque part.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Clic en dehors : la liste se referme.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const go = (club: ClubIndexEntry) => {
    setOpen(false);
    setQuery("");
    onNavigate?.();
    router.push(`/clubs/${club.league}/${club.id}`);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (results.length === 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index + (event.key === "ArrowDown" ? 1 : results.length - 1)) % results.length);
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      go(results[active] ?? results[0]);
    }
  };

  const expanded = open && results.length > 0;

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm focus-within:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-slate-500">
        <Search className="size-4 shrink-0 text-slate-400" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Rechercher un club"
          aria-label="Rechercher un club"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded ? `${listId}-${active}` : undefined}
          className="w-full min-w-0 bg-transparent outline-none placeholder:text-slate-400 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Effacer la recherche"
            className="shrink-0 rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </div>

      {open && normalize(query).length >= 2 && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Clubs trouvés"
          className="absolute right-0 z-50 mt-2 max-h-80 w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">Aucun club trouvé.</li>
          ) : (
            results.map((club, index) => {
              const league = getLeague(club.league);
              return (
                <li key={`${club.league}-${club.id}`} id={`${listId}-${index}`} role="option" aria-selected={index === active}>
                  <Link
                    href={`/clubs/${club.league}/${club.id}`}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                      onNavigate?.();
                    }}
                    onMouseEnter={() => setActive(index)}
                    className={`flex items-center gap-3 rounded-lg px-2 py-2 ${
                      index === active ? "bg-slate-100 dark:bg-slate-800" : ""
                    }`}
                  >
                    <TeamLogo team={{ ...club, logo: club.logo }} size={24} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{club.name}</span>
                    {league && (
                      <span className="flex shrink-0 items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <LeagueLogo league={league} size={14} />
                        <span className="hidden sm:inline">{league.name}</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
