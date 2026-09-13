"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Recharge périodiquement la page servie par le cache Next.js
// (et non l'API ESPN) pour suivre les matchs en direct.
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);

  return null;
}
