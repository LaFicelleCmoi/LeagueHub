import { EuropeanTrackers } from "@/components/EuropeanTrackers";
import { FavoriteClubPicker } from "@/components/FavoriteClubPicker";
import { HeroBadge } from "@/components/HeroBadge";
import { LeagueGroupLink } from "@/components/LeagueShortcuts";
import { LeaguesHome } from "@/components/LeaguesHome";
import { clubIndex } from "@/lib/clubs";
import { getLeague, LEAGUES, SECOND_DIVISIONS, SECOND_DIVISIONS_HREF } from "@/lib/leagues";

export const revalidate = 60;

export default function HomePage() {
  return (
    <LeaguesHome
      leagues={LEAGUES}
      title="Les 5 grands championnats européens"
      intro="Classements, résultats, calendriers, buteurs et actualités de la Premier League, La Liga, Serie A, Bundesliga et Ligue 1, réunis au même endroit."
      aside={
        <div className="flex flex-col gap-3">
          {/* Badge 3D sur grand écran seulement : sur mobile et tablette, il repoussait tout le contenu. */}
          <div className="hidden lg:block">
            <HeroBadge division={1} />
          </div>
          {/* Club favori parmi les 5 grands ; les deuxièmes divisions ont le leur. */}
          <FavoriteClubPicker division={1} clubs={clubIndex().filter((club) => getLeague(club.league)?.tier === 1)} />
        </div>
      }
      footer={
        <LeagueGroupLink
          href={SECOND_DIVISIONS_HREF}
          eyebrow="Un autre espace"
          title="Les deuxièmes divisions"
          description="Championship, Segunda División, Serie B, 2. Bundesliga et Ligue 2"
          leagues={SECOND_DIVISIONS}
        />
      }
    >
      <EuropeanTrackers />
    </LeaguesHome>
  );
}
