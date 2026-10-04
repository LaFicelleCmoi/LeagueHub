import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Hors ligne",
  robots: { index: false },
};

// Page affichée par le service worker quand la connexion est coupée.
export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-slate-100 dark:bg-slate-800">
        <WifiOff className="size-8 text-slate-400" aria-hidden />
      </span>
      <h1 className="mt-6 text-2xl font-bold tracking-tight">Vous êtes hors ligne</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Les scores et les classements arrivent en direct : ils s’afficheront dès le retour de la connexion.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        Réessayer
      </Link>
    </div>
  );
}
