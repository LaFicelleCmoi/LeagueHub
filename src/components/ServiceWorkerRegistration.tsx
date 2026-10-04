"use client";

import { useEffect } from "react";

// Enregistre le service worker (site installable, page hors ligne). Uniquement en production :
// en développement, il gênerait le rechargement à chaud.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Sans service worker, le site fonctionne normalement : rien à signaler.
    });
  }, []);

  return null;
}
