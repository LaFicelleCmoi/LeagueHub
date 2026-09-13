import type { Zone, ZoneTone } from "./types";

// Styles partagés par le tableau de classement complet et les cartes top 5.

const ZONE_COLORS: Record<ZoneTone, string> = {
  ucl: "bg-blue-600",
  uel: "bg-orange-500",
  uecl: "bg-emerald-500",
  playoff: "bg-amber-400",
  relegation: "bg-red-600",
  other: "bg-slate-400",
};

export function zoneClass(zone: Zone): string {
  return `${ZONE_COLORS[zone.tone]} ${zone.qualifying ? "opacity-50" : ""}`;
}

export function goalDiffClass(diff: number): string {
  if (diff > 0) return "text-emerald-600 dark:text-emerald-400";
  if (diff < 0) return "text-red-600 dark:text-red-400";
  return "text-slate-400 dark:text-slate-500";
}
