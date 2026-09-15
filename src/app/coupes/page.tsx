import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { CupCard } from "@/components/CupCard";
import { CupsAgenda } from "@/components/CupsAgenda";
import { CupsNav } from "@/components/CupsNav";
import { CupsTabNotice } from "@/components/CupsTabSwitch";
import { PageSync } from "@/components/PageSync";
import { CUPS } from "@/lib/cups";
import { getCupOverview } from "@/lib/espn/api";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Coupes nationales",
  description:
    "FA Cup, Copa del Rey, Coppa Italia, DFB-Pokal et Coupe de France : calendrier officiel, tours, résultats, prochains matchs et exploits.",
};

// Grand écran : 3 cartes puis 2 plus larges, sans case vide. Tablette : la 5e prend toute la largeur.
const SPANS = ["lg:col-span-2", "lg:col-span-2", "lg:col-span-2", "lg:col-span-3", "md:col-span-2 lg:col-span-3"];

export default async function CupsPage() {
  const renderedAt = Date.now();
  // Une coupe indisponible ne doit pas empêcher d'afficher les autres.
  const cups = await Promise.all(
    CUPS.map(async (cup) => ({ cup, overview: await getCupOverview(cup).catch(() => null) })),
  );

  return (
    <div className="space-y-8">
      <PageSync renderedAt={renderedAt} maxAge={330_000} />
      <CupsTabNotice />

      <section className="relative overflow-hidden rounded-3xl border border-amber-300/60 bg-gradient-to-br from-amber-50 via-white to-white p-6 sm:p-8 dark:border-amber-500/20 dark:from-amber-500/10 dark:via-slate-900 dark:to-slate-950">
        <Trophy aria-hidden className="pointer-events-none absolute -right-6 -top-6 size-48 text-amber-400/20" />
        <p className="relative inline-flex items-center gap-2 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-950">
          <Trophy className="size-3.5" aria-hidden />
          Onglet spécial
        </p>
        <h1 className="relative mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Coupes nationales</h1>
        <p className="relative mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
          FA Cup, Copa del Rey, Coppa Italia, DFB-Pokal et Coupe de France : calendrier officiel, parcours, résultats,
          prochains matchs et exploits des petits poucets face aux clubs de l’élite.
        </p>
      </section>

      <CupsNav />

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-6">
        {cups.map(({ cup, overview }, index) => (
          <div key={cup.slug} className={SPANS[index] ?? "lg:col-span-2"}>
            <CupCard cup={cup} overview={overview} />
          </div>
        ))}
      </div>

      <CupsAgenda items={cups} />
    </div>
  );
}
