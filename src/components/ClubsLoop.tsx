"use client";

import { useCallback, useMemo, type Key } from "react";
import { Star } from "lucide-react";
import { useFavoriteClub } from "@/lib/favorite-club";
import { getLeague } from "@/lib/leagues";
import type { ClubRef } from "@/lib/types";
import { useOpenClub } from "./ClubDialogProvider";
import { LeagueLogo } from "./LeagueLogo";
import LogoLoop, { type LogoItem } from "./reactbits/LogoLoop";
import { TeamLogo } from "./TeamLogo";

// Bandeau des clubs : un clic ouvre les 5 derniers matchs du club (fenêtre partagée de la page).
export function ClubsLoop({ clubs }: { clubs: ClubRef[] }) {
  const openClub = useOpenClub();
  const favoriteId = useFavoriteClub()?.team.id;

  const logos = useMemo<LogoItem[]>(() => clubs.map((club) => ({ node: null, title: club.team.name })), [clubs]);

  const renderItem = useCallback(
    (_item: LogoItem, key: Key) => {
      // LogoLoop duplique la liste pour boucler (clé « copie-index ») :
      // seule la première copie est atteignable au clavier.
      const [copy, index] = String(key).split("-").map(Number);
      const club = clubs[index];
      const league = club ? getLeague(club.league) : undefined;
      if (!club || !league) return null;
      const favorite = club.team.id === favoriteId;

      return (
        <button
          type="button"
          tabIndex={copy === 0 ? 0 : -1}
          onClick={() => openClub?.(club)}
          title={club.team.name}
          aria-label={`${club.team.name} (${league.name})${favorite ? ", club favori" : ""} : voir les 5 derniers matchs`}
          className={`relative block rounded-full p-1.5 transition-transform duration-200 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 motion-reduce:transition-none dark:focus-visible:outline-white ${
            favorite ? "bg-amber-50 ring-2 ring-amber-400 dark:bg-amber-400/10" : ""
          }`}
        >
          <TeamLogo team={club.team} size={36} />
          {/* Indication discrète du championnat. */}
          <span
            aria-hidden
            className="absolute bottom-0.5 right-0.5 grid size-4 place-items-center rounded-full bg-white opacity-90 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
          >
            <LeagueLogo league={league} size={10} />
          </span>
          {favorite && (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-amber-400 shadow-sm ring-2 ring-white dark:ring-slate-950"
            >
              <Star className="size-2.5 fill-white text-white" />
            </span>
          )}
        </button>
      );
    },
    [clubs, openClub, favoriteId],
  );

  return (
    <section aria-label="Clubs des 5 championnats">
      <p className="mb-1 text-center text-xs text-slate-500 dark:text-slate-400">
        Touchez un club pour voir ses 5 derniers matchs
      </p>
      <LogoLoop
        logos={logos}
        renderItem={renderItem}
        speed={40}
        gap={24}
        logoHeight={48}
        // Ne s'arrête jamais : simple ralentissement au survol pour garder les logos faciles à cliquer.
        hoverSpeed={20}
        fadeOut
        fadeOutColor="var(--page-bg)"
        ariaLabel="Clubs des 5 championnats"
      />
    </section>
  );
}
