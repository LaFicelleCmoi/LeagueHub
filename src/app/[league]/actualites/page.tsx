import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";
import { NewsCard } from "@/components/NewsCard";
import { getNews } from "@/lib/espn/api";
import { resolveLeague, type LeaguePageProps } from "@/lib/league-params";

export const revalidate = 900;

export async function generateMetadata({ params }: LeaguePageProps): Promise<Metadata> {
  const league = await resolveLeague(params);
  return {
    title: `Actualités ${league.name}`,
    description: `Les dernières actualités de la ${league.name}.`,
  };
}

export default async function NewsPage({ params }: LeaguePageProps) {
  const league = await resolveLeague(params);
  const articles = await getNews(league);

  if (articles.length === 0) {
    return <EmptyState>Aucune actualité pour le moment.</EmptyState>;
  }

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <NewsCard key={article.id} article={article} />
        ))}
      </div>
      <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">Articles en anglais publiés par ESPN.</p>
    </div>
  );
}
