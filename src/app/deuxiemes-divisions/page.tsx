import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { LeagueGroupLink } from "@/components/LeagueShortcuts";
import { LeaguesHome } from "@/components/LeaguesHome";
import { LEAGUES, SECOND_DIVISIONS } from "@/lib/leagues";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Deuxièmes divisions",
  description:
    "Classements, scores en direct, calendriers et buteurs de la Championship, Segunda División, Serie B, 2. Bundesliga et Ligue 2.",
};

export default function SecondDivisionsPage() {
  return (
    <LeaguesHome
      leagues={SECOND_DIVISIONS}
      eyebrow={
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Les 5 grands championnats
        </Link>
      }
      title="Les deuxièmes divisions européennes"
      intro="Montée, barrages et relégation : classements, résultats, calendriers, buteurs et actualités de la Championship, Segunda División (LaLiga Hypermotion), Serie B, 2. Bundesliga et Ligue 2 (BKT)."
      shortcutsHeading="Choisir une deuxième division"
      shortcutsFooter={
        <LeagueGroupLink
          href="/"
          title="Les 5 grands championnats"
          description="Premier League, La Liga, Serie A, Bundesliga et Ligue 1"
          leagues={LEAGUES}
        />
      }
    />
  );
}
