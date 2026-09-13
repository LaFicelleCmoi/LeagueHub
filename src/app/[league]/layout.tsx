import type { CSSProperties, ReactNode } from "react";
import { LeagueLogo } from "@/components/LeagueLogo";
import { LeagueTabs } from "@/components/LeagueTabs";
import { resolveLeague, type LeaguePageProps } from "@/lib/league-params";
import { LEAGUES } from "@/lib/leagues";

// Seuls les 5 championnats sont générés ; toute autre URL renvoie une 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return LEAGUES.map((league) => ({ league: league.slug }));
}

export default async function LeagueLayout({ children, params }: LeaguePageProps & { children: ReactNode }) {
  const league = await resolveLeague(params);

  return (
    <div style={{ "--accent": league.accent } as CSSProperties}>
      <div className="mb-6 flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <LeagueLogo league={league} size={44} />
        </div>
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            <span aria-hidden className="h-3 w-1 rounded-full bg-[var(--accent)]" />
            {league.country}
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{league.name}</h1>
        </div>
      </div>

      <LeagueTabs slug={league.slug} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
