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

type EspnFetchOptions = { params?: Record<string, string | number> } & (
  | {
      /** Durée de vie du cache Next.js, en secondes. */
      revalidate: number;
      memoryTtl?: never;
    }
  | {
      /**
       * Données qui suivent le direct, gardées quelques millisecondes en mémoire. Le Data Cache de
       * Next.js est évité : une fois expiré, il renvoie encore l'ancienne version le temps de se mettre
       * à jour, soit un cycle de retard sur le score réel.
       */
      memoryTtl: number;
      revalidate?: never;
    }
);

const memory = new Map<string, { expires: number; data: Promise<unknown> }>();

async function request<T>(url: URL, init: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new EspnError(`ESPN a répondu ${response.status}`, response.status);
  }
  return (await response.json()) as T;
}

export async function espnFetch<T>(path: string, { revalidate, memoryTtl, params }: EspnFetchOptions): Promise<T> {
  const url = new URL(`${ESPN_API}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, String(value));
  }

  if (memoryTtl === undefined) {
    // `next.revalidate` place la réponse dans le Data Cache de Next.js :
    // ESPN n'est interrogé qu'une fois par période, quel que soit le trafic.
    return request<T>(url, { next: { revalidate, tags: ["espn"] } });
  }

  // Copie en mémoire partagée par les requêtes simultanées : ESPN reste protégé
  // sans jamais servir une réponse plus vieille que `memoryTtl`.
  const key = url.toString();
  const now = Date.now();
  const cached = memory.get(key);
  if (cached && cached.expires > now) return cached.data as Promise<T>;

  if (memory.size > 500) {
    for (const [entryKey, entry] of memory) {
      if (entry.expires <= now) memory.delete(entryKey);
    }
  }

  const data = request<T>(url, { cache: "no-store" });
  memory.set(key, { expires: now + memoryTtl, data });
  // Une erreur ne doit pas rester en mémoire.
  data.catch(() => memory.delete(key));
  return data;
}
