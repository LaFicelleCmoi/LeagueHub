// Images d'ESPN redimensionnées par ESPN lui-même (service « combiner ») : le site ne passe plus par
// l'optimisation d'images de Vercel, facturée à la transformation. Un logo affiché en 24 px pèse
// ainsi quelques kilo-octets au lieu des 25 Ko de l'original en 500 px.

const ESPN_HOST = "https://a.espncdn.com";
/** Tailles fixes : peu de variantes différentes, donc de bonnes chances d'être déjà en cache chez ESPN. */
const BUCKETS = [32, 48, 64, 96, 128, 200, 320, 480, 640, 960];

function bucket(width: number): number {
  return BUCKETS.find((size) => size >= width) ?? BUCKETS[BUCKETS.length - 1];
}

/**
 * URL d'une image ESPN à la largeur voulue (en pixels réels, donc le double de la taille affichée
 * sur un écran haute densité). `square` : logos, redimensionnés en carré.
 * Les images hors du CDN principal d'ESPN sont renvoyées telles quelles.
 */
export function espnImage(url: string, width: number, { square = true }: { square?: boolean } = {}): string {
  if (!url.startsWith(`${ESPN_HOST}/i/`) && !url.startsWith(`${ESPN_HOST}/photo/`)) return url;
  const size = bucket(width);
  const path = url.slice(ESPN_HOST.length).split("?")[0];
  return `${ESPN_HOST}/combiner/i?img=${path}&w=${size}${square ? `&h=${size}` : ""}`;
}
