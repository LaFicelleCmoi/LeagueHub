import { NextResponse } from "next/server";
import { getSquad } from "@/lib/espn/api";
import { EspnError } from "@/lib/espn/client";
import { getLeague } from "@/lib/leagues";

// Effectif d'un club et chiffres de ses joueurs, pour le simulateur de match.
export async function GET(_request: Request, { params }: { params: Promise<{ league: string; team: string }> }) {
  const { league: slug, team } = await params;
  const league = getLeague(slug);

  if (!league || !/^\d{1,10}$/.test(team)) {
    return NextResponse.json({ error: "Club inconnu" }, { status: 404 });
  }

  try {
    const squad = await getSquad(team, league);
    return NextResponse.json(squad, { headers: { "Cache-Control": "public, s-maxage=3600" } });
  } catch (error) {
    const notFound = error instanceof EspnError && error.status === 404;
    return NextResponse.json(
      { error: notFound ? "Club inconnu" : "Effectif momentanément indisponible" },
      { status: notFound ? 404 : 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
