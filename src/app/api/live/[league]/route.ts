import { NextResponse } from "next/server";
import { getCup } from "@/lib/cups";
import { getCupLiveMatches, getLiveMatches } from "@/lib/espn/api";
import { getLeague } from "@/lib/leagues";

// Scores en direct pour le navigateur, d'un championnat ou d'une coupe nationale.
// Pas de Data Cache de Next.js : une fois expiré, il renverrait encore l'ancienne version
// pendant sa mise à jour, soit un rafraîchissement de retard. ESPN reste protégé par :
// - une copie en mémoire de 5 s partagée par les requêtes simultanées (voir espnFetch) ;
// - le CDN de Vercel (s-maxage), qui répond sans même exécuter cette fonction.
// Pas de stale-while-revalidate côté CDN : un score n'y reste jamais plus de 5 s.
const CACHE_HEADERS = { "Cache-Control": "public, s-maxage=5" };

export async function GET(_request: Request, { params }: { params: Promise<{ league: string }> }) {
  const { league: slug } = await params;
  const league = getLeague(slug);
  const cup = league ? undefined : getCup(slug);

  if (!league && !cup) {
    return NextResponse.json({ error: "Compétition inconnue" }, { status: 404 });
  }

  try {
    const matches = league ? await getLiveMatches(league) : cup ? await getCupLiveMatches(cup) : [];
    return NextResponse.json({ matches }, { headers: CACHE_HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Scores momentanément indisponibles" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
