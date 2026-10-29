import type { Metadata } from "next";
import { Suspense } from "react";
import { MatchSimulator } from "@/components/MatchSimulator";
import { clubIndex } from "@/lib/clubs";

export const metadata: Metadata = {
  title: "Simulateur de match",
  description:
    "Choisis deux clubs, règle le score et les cartons ou laisse faire le hasard, puis regarde le match se jouer minute par minute avec les vrais joueurs.",
};

export default function SimulatorPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Simulateur de match</h1>
        <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
          Choisis l&apos;affiche, décide du score et des cartons ou laisse faire le hasard, puis regarde le match se jouer minute par
          minute avec les vrais joueurs des deux clubs.
        </p>
      </header>
      {/* Suspense : le simulateur lit les réglages d'un lien partagé dans l'adresse. */}
      <Suspense>
        <MatchSimulator clubs={clubIndex()} />
      </Suspense>
    </div>
  );
}
