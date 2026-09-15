"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/** Rechargements tentés d'affilée quand le serveur renvoie encore une page en cache. */
const MAX_ATTEMPTS = 3;
/** Laisse au serveur le temps de régénérer la page avant de la redemander. */
const RETRY_DELAY = 4_000;
const FIRST_DELAY = 1_500;

// Resynchronise une page servie depuis le cache : à la première visite après un long moment,
// Next.js peut renvoyer une version vieille de plusieurs heures pendant qu'il la régénère.
// Les données du serveur sont alors rechargées, puis régulièrement tant que l'onglet reste ouvert.
export function PageSync({ renderedAt, maxAge = 90_000 }: { renderedAt: number; maxAge?: number }) {
  const router = useRouter();
  const attempts = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const sync = () => {
      clearTimeout(timer);
      if (document.visibilityState !== "visible") return;

      const age = Date.now() - renderedAt;
      if (age < maxAge) {
        attempts.current = 0;
        timer = setTimeout(sync, maxAge - age);
        return;
      }

      if (attempts.current >= MAX_ATTEMPTS) {
        // Le serveur est encore en retard : on laisse passer une période complète.
        attempts.current = 0;
        timer = setTimeout(sync, maxAge);
        return;
      }

      timer = setTimeout(
        () => {
          attempts.current += 1;
          router.refresh();
          // Une page toujours périmée après le rechargement déclenche une nouvelle tentative.
          timer = setTimeout(sync, RETRY_DELAY);
        },
        attempts.current === 0 ? FIRST_DELAY : 0,
      );
    };

    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [renderedAt, maxAge, router]);

  return null;
}
