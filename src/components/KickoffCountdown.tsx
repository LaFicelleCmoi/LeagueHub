"use client";

import { Timer } from "lucide-react";
import { COUNTDOWN_WINDOW, useNow } from "@/lib/countdown";
import { plural } from "@/lib/league-stats";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Passé ce délai après l'heure prévue sans passage en direct (report, retard d'ESPN), on n'insiste plus. */
const IMMINENT_GRACE = 30 * 60_000;

const STYLES = {
  light: {
    calm: "bg-indigo-50 text-indigo-900 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-100 dark:ring-indigo-400/30",
    soon: "bg-amber-50 text-amber-900 ring-amber-300 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-400/40",
    hot: "bg-red-50 text-red-700 ring-red-300 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-400/40",
  },
  // Sur les affiches sombres des coupes d'Europe.
  dark: {
    calm: "bg-white/15 text-white ring-white/25",
    soon: "bg-amber-400/25 text-white ring-amber-300/50",
    hot: "bg-red-500/80 text-white ring-red-300/60",
  },
} as const;

const pad = (value: number) => String(value).padStart(2, "0");

function Segment({ value, unit }: { value: string; unit: string }) {
  return (
    <span className="inline-flex items-baseline">
      <span className="font-bold tabular-nums">{value}</span>
      <span className="ml-px text-[10px] opacity-70">{unit}</span>
    </span>
  );
}

/** Compte à rebours jusqu'au coup d'envoi, affiché dans les 3 jours qui le précèdent. */
export function KickoffCountdown({
  date,
  variant = "light",
  className = "",
}: {
  date: string;
  variant?: keyof typeof STYLES;
  className?: string;
}) {
  const now = useNow();
  const remaining = Date.parse(date) - now;
  if (now === 0 || remaining > COUNTDOWN_WINDOW || remaining < -IMMINENT_GRACE) return null;

  const tone = remaining < HOUR ? "hot" : remaining < DAY ? "soon" : "calm";
  const box = `flex w-fit max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-lg px-2.5 py-1 text-xs ring-1 ${STYLES[variant][tone]} ${className}`;
  const icon =
    tone === "hot" ? (
      <span className="relative flex size-2 shrink-0" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex size-2 rounded-full bg-current" />
      </span>
    ) : (
      <Timer className="size-3.5 shrink-0" aria-hidden />
    );

  if (remaining <= 0) {
    return (
      <p role="timer" className={box}>
        {icon}
        <span className="font-semibold">Coup d’envoi imminent</span>
      </p>
    );
  }

  const total = Math.floor(remaining / 1000);
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  // Les lecteurs d'écran n'ont pas besoin des secondes.
  const spoken = [
    days > 0 ? `${days} ${plural(days, "jour", "jours")}` : null,
    days > 0 || hours > 0 ? `${hours} ${plural(hours, "heure", "heures")}` : null,
    `${minutes} ${plural(minutes, "minute", "minutes")}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <p role="timer" className={box}>
      {icon}
      <span className="sr-only">Coup d’envoi dans {spoken}</span>
      <span aria-hidden className="whitespace-nowrap opacity-80">
        Coup d’envoi dans
      </span>
      <span aria-hidden className="inline-flex items-baseline gap-1 whitespace-nowrap">
        {days > 0 && <Segment value={String(days)} unit="j" />}
        {(days > 0 || hours > 0) && <Segment value={pad(hours)} unit="h" />}
        <Segment value={pad(minutes)} unit="min" />
        <Segment value={pad(seconds)} unit="s" />
      </span>
    </p>
  );
}
