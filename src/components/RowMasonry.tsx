"use client";

import { useSyncExternalStore, type ReactNode } from "react";

/** Point de rupture « xl » de Tailwind : trois colonnes au-delà, deux en dessous. */
const XL_QUERY = "(min-width: 80rem)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(XL_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Blocs de hauteurs différentes rangés sans trou ET dans l'ordre de lecture (ligne par ligne) :
 * le 1er à gauche, le 2e au milieu, le 3e à droite, le 4e sous le 1er…
 * Une grille laisserait un vide sous les blocs courts ; des colonnes CSS liraient de haut en bas.
 *
 * Sous 768 px, une seule colonne : les enveloppes de colonne s'effacent (display: contents) et
 * « order » rétablit l'ordre d'origine, sans attendre le JavaScript.
 */
export function RowMasonry({ items, gap = "gap-6" }: { items: { key: string; node: ReactNode }[]; gap?: string }) {
  // Rendu serveur en trois colonnes (le cas le plus courant), corrigé dès l'hydratation.
  const columnCount = useSyncExternalStore(
    subscribe,
    () => (window.matchMedia(XL_QUERY).matches ? 3 : 2),
    () => 3,
  );

  const columns = Array.from({ length: columnCount }, (_, column) =>
    items.map((item, index) => ({ ...item, index })).filter(({ index }) => index % columnCount === column),
  );

  return (
    <div className={`flex flex-col ${gap} md:flex-row md:items-start`}>
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className={`contents md:flex md:min-w-0 md:flex-1 md:flex-col ${gap}`}>
          {column.map(({ key, node, index }) => (
            <div key={key} style={{ order: index }} className="min-w-0">
              {node}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
