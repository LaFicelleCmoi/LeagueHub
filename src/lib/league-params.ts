import { notFound } from "next/navigation";
import { getLeague, type League } from "./leagues";

export interface LeaguePageProps {
  params: Promise<{ league: string }>;
}

export async function resolveLeague(params: LeaguePageProps["params"]): Promise<League> {
  const { league } = await params;
  return getLeague(league) ?? notFound();
}
