"use client";

import { useCallback, useMemo, useState, type Key } from "react";
import { getLeague } from "@/lib/leagues";
import type { ClubRef } from "@/lib/types";
import { ClubDialog } from "./ClubDialog";
import { LeagueLogo } from "./LeagueLogo";
import LogoLoop, { type LogoItem } from "./reactbits/LogoLoop";
import { TeamLogo } from "./TeamLogo";

// Bandeau des clubs : un clic ouvre les 5 derniers matchs du club.
export function ClubsLoop({ clubs }: { clubs: ClubRef[] }) {
  const [selected, setSelected] = useState<ClubRef | null>(null);

  const logos = useMemo<LogoItem[]>(() => clubs.map((club) => ({ node: null, title: club.team.name })), [clubs]);

  const renderItem = useCallback(
    (_item: LogoItem, key: Key) => {
      // LogoLoop duplique la liste pour boucler (clé « copie-index ») :
      // seule la première copie est atteignable au clavier.
      const [copy, index] = String(key).split("-").map(Number);
      const club = clubs[index];
      const league = club ? getLeague(club.league) : undefined;
      if (!club || !league) return null;

      return (
        <button
          type="button"
          tabIndex={copy === 0 ? 0 : -1}
          onClick={() => setSelected(club)}
          title={club.team.name}
          aria-label={`${club.team.name} (${league.name}) : voir les 5 derniers matchs`}
          className="relative block rounded-full p-1.5 transition-transform duration-200 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 motion-reduce:transition-none dark:focus-visible:outline-white"
        >
          <TeamLogo team={club.team} size={36} />
          {/* Indication discrète du championnat. */}
          <span
            aria-hidden
            className="absolute bottom-0.5 right-0.5 grid size-4 place-items-center rounded-full bg-white opacity-90 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
          >
            <LeagueLogo league={league} size={10} />
          </span>
        </button>
      );
    },
    [clubs],
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
        pauseOnHover
        fadeOut
        fadeOutColor="var(--page-bg)"
        ariaLabel="Clubs des 5 championnats"
      />
      <ClubDialog club={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
