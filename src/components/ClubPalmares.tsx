import { ChevronRight, Star, Trophy } from "lucide-react";
import { plural } from "@/lib/league-stats";
import { TROPHY_SCOPES, type ClubPalmares as ClubPalmaresData, type Trophy as ClubTrophy } from "@/lib/palmares";
import { EmptyState } from "./EmptyState";
import { EUROPEAN_CUP_STYLES } from "./EuropeanCup";

/** Années des sacres, une pastille par titre : « quand ? » est la première question du visiteur. */
function Years({ years, variant = "light" }: { years: string[]; variant?: "light" | "dark" }) {
  if (years.length === 0) return null;
  return (
    <p className="mt-1.5 flex flex-wrap gap-1">
      <span className="sr-only">Sacres en </span>
      {years.map((year) => (
        <span
          key={year}
          className={`rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
            variant === "dark"
              ? "bg-white/10 text-amber-100 ring-1 ring-inset ring-white/15"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {year}
        </span>
      ))}
    </p>
  );
}

/**
 * Carte vedette du club champion d'Europe. La Ligue des champions ne se range pas dans une liste :
 * elle reprend l'indigo et l'étoile de la compétition, avec une étoile par titre comme sur un maillot.
 */
function ChampionsBanner({ trophy }: { trophy: ClubTrophy }) {
  const stars = Math.min(trophy.count, 15);
  return (
    <div className={`relative overflow-hidden rounded-2xl border text-white shadow-sm ${EUROPEAN_CUP_STYLES.ucl.card}`}>
      {/* Liseré doré, halo et constellation : la matière d'un trophée, sans rien emprunter à l'UEFA. */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
      <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full bg-amber-300/10 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-40 opacity-[0.12]">
        <Star className="absolute right-4 top-4 size-24 fill-current" />
        <Star className="absolute right-28 top-10 size-4 fill-current" />
        <Star className="absolute bottom-4 right-10 size-6 fill-current" />
        <Star className="absolute bottom-10 right-32 size-3 fill-current" />
      </div>

      <div className="relative flex flex-wrap items-center gap-x-8 gap-y-5 p-5 sm:p-6">
        <p className="flex items-center gap-4">
          <span className="text-6xl font-black leading-none tabular-nums text-amber-100 drop-shadow-sm">{trophy.count}</span>
          <span className="text-sm font-bold uppercase leading-tight tracking-wider">
            Ligue
            <br />
            des champions
          </span>
        </p>

        <span aria-hidden className="hidden h-12 w-px bg-white/15 sm:block" />

        {/* Sur mobile, étoiles et millésimes passent à la ligne plutôt que de se tasser. */}
        <div className="w-full min-w-0 sm:w-auto sm:flex-1">
          <p aria-hidden className="flex flex-wrap items-center gap-1 text-amber-200">
            {Array.from({ length: stars }, (_, index) => (
              <Star key={index} className="size-4 fill-current" />
            ))}
            {trophy.count > stars && <span className="text-xs font-bold">+{trophy.count - stars}</span>}
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-white/70">
            {plural(trophy.count, "sacre européen", "sacres européens")}
          </p>
          <Years years={trophy.years} variant="dark" />
        </div>
      </div>
    </div>
  );
}

function TrophyRow({ trophy }: { trophy: ClubTrophy }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-sm font-bold tabular-nums text-amber-900 ring-1 ring-inset ring-amber-500/15 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-300/20">
        {trophy.count}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{trophy.label}</span>
        <Years years={trophy.years} />
      </span>
    </li>
  );
}

/** Ligue des champions en vedette, titres majeurs par périmètre, le reste replié. */
function Trophies({ club }: { club: ClubPalmaresData }) {
  const champions = club.trophies.find((trophy) => trophy.key === "c1");
  const others = club.trophies.filter((trophy) => trophy.scope === "autre");

  return (
    <>
      {champions && <ChampionsBanner trophy={champions} />}

      {/* Colonnes à la façon d'une maçonnerie : un palmarès national fourni ne laisse pas
          une colonne « Europe » à moitié vide à côté de lui. */}
      <div className="columns-1 gap-4 md:columns-2 [&>section]:mb-4 [&>section]:break-inside-avoid">
        {TROPHY_SCOPES.map(({ scope, label }) => {
          const trophies = club.trophies.filter((trophy) => trophy.scope === scope && trophy !== champions);
          if (trophies.length === 0) return null;
          return (
            <section
              key={scope}
              aria-label={label}
              className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</h3>
              <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
                {trophies.map((trophy) => (
                  <TrophyRow key={trophy.key} trophy={trophy} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {others.length > 0 && (
        // Divisions inférieures, coupes régionales et tournois de jeunes : présents, mais à leur place.
        <details className="group rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl p-4 text-[11px] font-bold uppercase tracking-wide text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden />
            Autres trophées
            <span className="font-semibold normal-case tracking-normal">({others.length})</span>
          </summary>
          <ul className="divide-y divide-slate-100 px-4 pb-2 dark:divide-slate-800">
            {others.map((trophy) => (
              <TrophyRow key={trophy.key} trophy={trophy} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

/** Section « Palmarès » de la fiche d'un club. */
export function ClubPalmares({ club }: { club: ClubPalmaresData | null }) {
  const empty = !club || club.trophies.length === 0;
  return (
    <section aria-labelledby="club-palmares-heading" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="club-palmares-heading" className="flex items-center gap-2 text-lg font-semibold">
          <Trophy className="size-5 text-amber-500" aria-hidden />
          Palmarès
        </h2>
        {club && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {club.total} {plural(club.total, "trophée", "trophées")} · relevé sur Wikidata
          </p>
        )}
      </div>

      {empty ? (
        <EmptyState>{club ? "Aucun trophée relevé pour ce club." : "Palmarès indisponible pour le moment."}</EmptyState>
      ) : (
        <Trophies club={club} />
      )}
    </section>
  );
}
