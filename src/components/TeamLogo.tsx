import type { Team } from "@/lib/types";
import { ThemedLogo } from "./ThemedLogo";

function darkVariant(url: string): string | null {
  return url.includes("/teamlogos/soccer/500/") ? url.replace("/500/", "/500-dark/") : null;
}

export function TeamLogo({ team, size = 24 }: { team: Team; size?: number }) {
  if (!team.logo) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className="grid shrink-0 place-items-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300"
      >
        {team.abbreviation.slice(0, 3)}
      </span>
    );
  }

  return <ThemedLogo light={team.logo} dark={darkVariant(team.logo)} size={size} />;
}
