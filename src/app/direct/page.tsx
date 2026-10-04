import type { Metadata } from "next";
import Link from "next/link";
import { DirectBoard } from "@/components/DirectBoard";
import { LiveIndicator, LiveMatchesProvider } from "@/components/LiveMatches";
import { PageSync } from "@/components/PageSync";
import { getDirectDay } from "@/lib/espn/api";
import { addDays, formatDay } from "@/lib/format";
import { plural } from "@/lib/league-stats";
import { selectTrackedMatches } from "@/lib/live";

export const metadata: Metadata = {
  title: "Direct",
  description:
    "Tous les matchs du jour en direct : Ligue des champions, Ligue Europa, Ligue Conférence, les 5 grands championnats et les coupes nationales.",
};

const DAYS = [
  { id: "hier", label: "Hier", offset: -1 },
  { id: "aujourdhui", label: "Aujourd’hui", offset: 0 },
  { id: "demain", label: "Demain", offset: 1 },
] as const;

interface DirectPageProps {
  searchParams: Promise<{ jour?: string }>;
}

export default async function DirectPage({ searchParams }: DirectPageProps) {
  const { jour } = await searchParams;
  const selected = DAYS.find((day) => day.id === jour) ?? DAYS[1];
  const now = new Date();
  const day = addDays(now, selected.offset);
  const groups = await getDirectDay(day);

  const total = groups.reduce((sum, group) => sum + group.matches.length, 0);
  // Le direct n'est suivi que pour la journée en cours (et les matchs du soir après minuit).
  const sources =
    selected.offset === 0
      ? groups
          .map((group) => ({ slug: group.competition.slug, matches: selectTrackedMatches(group.matches, now.getTime()) }))
          .filter((source) => source.matches.length > 0)
      : [];

  return (
    <LiveMatchesProvider sources={sources}>
      <PageSync renderedAt={now.getTime()} />
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight sm:text-3xl">
              <span aria-hidden className="relative flex size-3">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75 motion-reduce:hidden" />
                <span className="relative inline-flex size-3 rounded-full bg-red-500" />
              </span>
              Direct
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {formatDay(day)} · {total} {plural(total, "match", "matchs")} dans {groups.length}{" "}
              {plural(groups.length, "compétition", "compétitions")}
            </p>
          </div>
          <LiveIndicator />
        </header>

        <nav aria-label="Jour" className="inline-flex rounded-full border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          {DAYS.map((item) => {
            const active = item.id === selected.id;
            return (
              <Link
                key={item.id}
                href={item.offset === 0 ? "/direct" : `/direct?jour=${item.id}`}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <DirectBoard groups={groups} />
      </div>
    </LiveMatchesProvider>
  );
}
