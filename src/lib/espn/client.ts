import "server-only";

// Ce module ne peut être importé que côté serveur : l'URL de l'API
// n'apparaît jamais dans le bundle envoyé au navigateur.
const ESPN_API = "https://site.api.espn.com/apis";

export class EspnError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "EspnError";
  }
}

interface EspnFetchOptions {
  /** Durée de vie du cache Next.js, en secondes. */
  revalidate: number;
  params?: Record<string, string | number>;
}

export async function espnFetch<T>(path: string, { revalidate, params }: EspnFetchOptions): Promise<T> {
  const url = new URL(`${ESPN_API}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, String(value));
  }

  // `next.revalidate` place la réponse dans le Data Cache de Next.js :
  // ESPN n'est interrogé qu'une fois par période, quel que soit le trafic.
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate, tags: ["espn"] },
  });

  if (!response.ok) {
    throw new EspnError(`ESPN a répondu ${response.status}`, response.status);
  }

  return (await response.json()) as T;
}
