"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
      <TriangleAlert className="size-8 text-amber-500" aria-hidden />
      <h2 className="mt-4 text-lg font-semibold">Données momentanément indisponibles</h2>
      <p className="mt-1 max-w-md text-sm text-slate-600 dark:text-slate-400">
        Le fournisseur de données ne répond pas pour le moment. Réessayez dans quelques instants.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        <RefreshCw className="size-4" aria-hidden />
        Réessayer
      </button>
    </div>
  );
}
