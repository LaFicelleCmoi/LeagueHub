import { NextResponse } from "next/server";
import { getTeamForm } from "@/lib/espn/api";
import { EspnError } from "@/lib/espn/client";
import { getLeague } from "@/lib/leagues";

// Derniers résultats d'un club, pour la fenêtre ouverte depuis le bandeau des clubs.
export async function GET(_request: Request, { params }: { params: Promise<{ league: string; team: string }> }) {
  const { league, team } = await params;

  if (!getLeague(league) || !/^\d{1,10}$/.test(team)) {
    return NextResponse.json({ error: "Club inconnu" }, { status: 404 });
  }

  try {
    const form = await getTeamForm(team);
    if (!form) {
      return NextResponse.json({ error: "Club inconnu" }, { status: 404 });
    }
    return NextResponse.json(form, { headers: { "Cache-Control": "public, s-maxage=300" } });
  } catch (error) {
    const notFound = error instanceof EspnError && error.status === 404;
    return NextResponse.json(
      { error: notFound ? "Club inconnu" : "Résultats momentanément indisponibles" },
      { status: notFound ? 404 : 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
