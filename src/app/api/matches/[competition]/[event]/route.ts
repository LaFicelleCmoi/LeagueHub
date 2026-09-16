import { NextResponse } from "next/server";
import { isKnownCompetition } from "@/lib/espn/api";
import { EspnError } from "@/lib/espn/client";
import { getMatchDetail } from "@/lib/espn/match-detail";

// Détail d'un match (chronologie, statistiques, compositions, infos, commentaire) pour sa fenêtre.
// 15 s de cache pendant et avant le match, 5 min une fois terminé.
export async function GET(_request: Request, { params }: { params: Promise<{ competition: string; event: string }> }) {
  const { competition, event } = await params;

  if (!isKnownCompetition(competition) || !/^\d{1,12}$/.test(event)) {
    return NextResponse.json({ error: "Match inconnu" }, { status: 404 });
  }

  try {
    const detail = await getMatchDetail(competition, event);
    if (!detail) {
      return NextResponse.json({ error: "Match inconnu" }, { status: 404 });
    }
    const maxAge = detail.match.state === "post" ? 300 : 15;
    return NextResponse.json(detail, { headers: { "Cache-Control": `public, s-maxage=${maxAge}` } });
  } catch (error) {
    const notFound = error instanceof EspnError && error.status === 404;
    return NextResponse.json(
      { error: notFound ? "Match inconnu" : "Détail du match momentanément indisponible" },
      { status: notFound ? 404 : 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
