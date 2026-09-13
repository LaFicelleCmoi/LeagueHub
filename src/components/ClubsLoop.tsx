"use client";

import { useMemo } from "react";
import type { Team } from "@/lib/types";
import LogoLoop, { type LogoItem } from "./reactbits/LogoLoop";
import { TeamLogo } from "./TeamLogo";

// Bandeau décoratif des clubs : masqué aux lecteurs d'écran, les mêmes clubs
// restant accessibles dans les classements.
export function ClubsLoop({ teams }: { teams: Team[] }) {
  const logos = useMemo<LogoItem[]>(
    () => teams.map((team) => ({ node: <TeamLogo team={team} size={36} />, title: team.name })),
    [teams],
  );

  return (
    <div aria-hidden="true">
      <LogoLoop
        logos={logos}
        speed={40}
        gap={40}
        logoHeight={36}
        pauseOnHover
        fadeOut
        fadeOutColor="var(--page-bg)"
        ariaLabel="Clubs des 5 championnats"
      />
    </div>
  );
}
