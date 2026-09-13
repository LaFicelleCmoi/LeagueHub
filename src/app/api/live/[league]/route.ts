import { NextResponse } from "next/server";
import { getLiveMatches } from "@/lib/espn/api";
import { getLeague } from "@/lib/leagues";

// Scores en direct pour le navigateur. Deux niveaux de cache protègent ESPN :
// - le Data Cache de Next.js (15 s) partagé par toutes les requêtes ;
// - le CDN de Vercel (s-maxage), qui répond sans même exécuter cette fonction.
// Pas de stale-while-revalidate côté CDN : un score n'y reste jamais plus de 10 s.
const CACHE_HEADERS = { "Cache-Control": "public, s-maxage=10" };

export async function GET(_request: Request, { params }: { params: Promise<{ league: string }> }) {
  const { league: slug } = await params;
  const league = getLeague(slug);

  if (!league) {
    return NextResponse.json({ error: "Championnat inconnu" }, { status: 404 });
  }

  try {
    const matches = await getLiveMatches(league);
    return NextResponse.json({ matches }, { headers: CACHE_HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Scores momentanément indisponibles" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
