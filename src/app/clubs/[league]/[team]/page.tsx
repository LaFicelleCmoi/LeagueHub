import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, MapPin } from "lucide-react";
import { ClubPalmares } from "@/components/ClubPalmares";
import { EmptyState } from "@/components/EmptyState";
import { EUROPEAN_CUP_STYLES, EuropeanCupTag } from "@/components/EuropeanCup";
import { KickoffCountdown } from "@/components/KickoffCountdown";
import { LeagueLogo } from "@/components/LeagueLogo";
import { PageSync } from "@/components/PageSync";
import { StatTiles, type Stat } from "@/components/StatTiles";
import { TeamLogo } from "@/components/TeamLogo";
import { findClub } from "@/lib/clubs";
import { getClubSeason, getStandings, getTeamForm } from "@/lib/espn/api";
import { formatTime, TIME_ZONE } from "@/lib/format";
import { plural } from "@/lib/league-stats";
import { getLeague, type LeagueSlug } from "@/lib/leagues";
import { getPalmares } from "@/lib/palmares";
import type { ClubSeasonMatch } from "@/lib/types";

export const revalidate = 300;

const OUTCOMES = {
  win: { letter: "V", label: "Victoire", badge: "bg-emerald-600 text-white", score: "text-emerald-700 dark:text-emerald-400" },
  draw: { letter: "N", label: "Match nul", badge: "bg-slate-400 text-white dark:bg-slate-500", score: "text-slate-600 dark:text-slate-300" },
  loss: { letter: "D", label: "Défaite", badge: "bg-red-600 text-white", score: "text-red-700 dark:text-red-400" },
} as const;

const monthFormat = new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, month: "long", year: "numeric" });
const dayFormat = new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, weekday: "short", day: "numeric", month: "short" });
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

interface ClubPageProps {
  params: Promise<{ league: string; team: string }>;
}

async function resolve(params: ClubPageProps["params"]) {
  const { league: slug, team } = await params;
  const league = getLeague(slug);
  const club = league ? findClub(league.slug as LeagueSlug, team) : undefined;
  return league && club ? { league, club } : null;
}

export async function generateMetadata({ params }: ClubPageProps): Promise<Metadata> {
  const found = await resolve(params);
  return found
    ? {
        title: found.club.name,
        description: `${found.club.name} : déroulé de la saison en cours, bilan et palmarès complet (${found.league.name}).`,
      }
    : {};
}

/** Les matchs de la saison, groupés par mois. */
function byMonth(matches: ClubSeasonMatch[]) {
  const months = new Map<string, ClubSeasonMatch[]>();
  for (const match of matches) {
    const key = monthFormat.format(new Date(match.date));
    months.set(key, [...(months.get(key) ?? []), match]);
  }
  return [...months].map(([label, items]) => ({ label, items }));
}

function SeasonRow({ match }: { match: ClubSeasonMatch }) {
  const outcome = match.outcome ? OUTCOMES[match.outcome] : null;
  const played = match.goalsFor !== null && match.goalsAgainst !== null;
  const cup = match.europeanCup;

  return (
    <li
      className={`relative flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 ${
        cup ? `-mx-2 rounded-lg px-2 ${EUROPEAN_CUP_STYLES[cup].row}` : ""
      }`}
    >
      {cup && <span aria-hidden className={`absolute inset-y-2 left-0 w-1 rounded-r-full ${EUROPEAN_CUP_STYLES[cup].bar}`} />}
      <span className="w-24 shrink-0 text-xs text-slate-500 dark:text-slate-400">{capitalize(dayFormat.format(new Date(match.date)))}</span>
      {outcome ? (
        <span aria-hidden className={`grid size-6 shrink-0 place-items-center rounded-md text-xs font-bold ${outcome.badge}`}>
          {outcome.letter}
        </span>
      ) : (
        <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-md border border-dashed border-slate-300 text-[10px] text-slate-400 dark:border-slate-700">
          —
        </span>
      )}
      <span className="flex min-w-0 flex-1 items-center gap-2 text-sm">
        <span className="text-xs text-slate-400">{match.home ? "vs" : "chez"}</span>
        <TeamLogo team={match.opponent} size={20} />
        <span className="min-w-0 truncate font-medium">{match.opponent.name}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        {cup ? <EuropeanCupTag cup={cup} label={EUROPEAN_CUP_STYLES[cup].short} /> : <span className="truncate">{match.competition}</span>}
        {played ? (
          <span className={`text-base font-bold tabular-nums ${outcome?.score ?? ""}`}>
            <span className="sr-only">{outcome?.label ?? "Score"} </span>
            {match.goalsFor}–{match.goalsAgainst}
          </span>
        ) : (
          <span className="font-medium">{match.state === "pre" ? formatTime(match.date) : match.status}</span>
        )}
      </span>
      {match.state === "pre" && <KickoffCountdown date={match.date} className="ml-auto" />}
    </li>
  );
}

export default async function ClubPage({ params }: ClubPageProps) {
  const found = await resolve(params);
  if (!found) notFound();
  const { league, club } = found;

  const [form, season, standings] = await Promise.all([
    getTeamForm(club.id, league).catch(() => null),
    getClubSeason(club.id, league).catch(() => []),
    getStandings(league).catch(() => null),
  ]);
  const palmares = getPalmares(league.slug, club.id);
  const rank = standings?.rows.find((row) => row.team.id === club.id);
  const totals = form?.season;
  const now = Date.now();

  const stats: Stat[] = [
    { label: plural(totals?.played ?? 0, "match joué", "matchs joués"), value: totals?.played ?? 0, hint: "Toutes compétitions" },
    {
      label: plural(totals?.wins ?? 0, "victoire", "victoires"),
      value: totals?.wins ?? 0,
      hint: `${totals?.draws ?? 0} ${plural(totals?.draws ?? 0, "nul", "nuls")} · ${totals?.losses ?? 0} ${plural(totals?.losses ?? 0, "défaite", "défaites")}`,
    },
    {
      label: plural(totals?.goalsFor ?? 0, "but marqué", "buts marqués"),
      value: totals?.goalsFor ?? 0,
      hint: `${totals?.goalsAgainst ?? 0} ${plural(totals?.goalsAgainst ?? 0, "encaissé", "encaissés")}`,
    },
    {
      label: plural(palmares?.club.total ?? 0, "trophée remporté", "trophées remportés"),
      value: palmares?.club.total ?? 0,
      hint: palmares ? "Depuis la création du club" : "Palmarès indisponible",
      accent: true,
    },
  ];

  const played = season.filter((match) => match.outcome !== null || match.state === "post");
  const upcoming = season.filter((match) => match.state !== "post" && Date.parse(match.date) > now - 3 * 3_600_000);

  return (
    <div className="space-y-8">
      <PageSync renderedAt={now} maxAge={330_000} />

      <header className="flex flex-wrap items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <TeamLogo team={{ ...club }} size={44} />
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/${league.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <LeagueLogo league={league} size={16} />
            {league.name}
            <ChevronRight className="size-3.5" aria-hidden />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{club.name}</h1>
        </div>
        {rank && (
          <p className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
            {rank.rank === 1 ? "1er" : `${rank.rank}e`} · {rank.points} pts
          </p>
        )}
      </header>

      <StatTiles stats={stats} className="grid-cols-2 lg:grid-cols-4" />

      {form?.next && (
        <section aria-labelledby="club-next-heading" className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 id="club-next-heading" className="text-sm font-semibold">
            Prochain match
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <span className="text-xs text-slate-400">{form.next.home ? "vs" : "chez"}</span>
              <TeamLogo team={form.next.opponent} size={22} />
              <span className="truncate font-medium">{form.next.opponent.name}</span>
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {capitalize(dayFormat.format(new Date(form.next.date)))} · {formatTime(form.next.date)} · {form.next.competition}
            </span>
            <KickoffCountdown date={form.next.date} />
          </div>
          {form.next.venue && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{form.next.venue}</span>
            </p>
          )}
        </section>
      )}

      <ClubPalmares club={palmares?.club ?? null} />

      <section aria-labelledby="club-season-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="club-season-heading" className="text-lg font-semibold">
            Saison en cours
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {played.length} {plural(played.length, "match joué", "matchs joués")} · {upcoming.length}{" "}
            {plural(upcoming.length, "à venir", "à venir")}
          </p>
        </div>

        {season.length === 0 ? (
          <EmptyState>Aucun match pour l’instant dans la saison en cours.</EmptyState>
        ) : (
          <div className="space-y-5">
            {byMonth(season).map(({ label, items }) => (
              <div key={label}>
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</h3>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((match) => (
                    <SeasonRow key={match.id} match={match} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
