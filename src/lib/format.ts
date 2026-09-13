// Toutes les dates sont affichées en heure de Paris, quel que soit le fuseau
// du serveur (Vercel tourne en UTC).
export const TIME_ZONE = "Europe/Paris";

const dayFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

// en-CA produit directement le format AAAA-MM-JJ.
const keyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type DateInput = string | Date;

export function formatDay(date: DateInput): string {
  const label = dayFormatter.format(new Date(date));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatTime(date: DateInput): string {
  return timeFormatter.format(new Date(date));
}

export function formatDateTime(date: DateInput): string {
  return dateTimeFormatter.format(new Date(date));
}

/** Clé « AAAA-MM-JJ » du jour, en heure de Paris. */
export function dayKey(date: DateInput): string {
  return keyFormatter.format(new Date(date));
}

/** Format « AAAAMMJJ » attendu par le paramètre `dates` d'ESPN. */
export function espnDate(date: Date): string {
  return dayKey(date).replaceAll("-", "");
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export function formatGoalDiff(diff: number): string {
  return diff > 0 ? `+${diff}` : String(diff);
}

export function groupByDay<T extends { date: string }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = dayKey(item.date);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return [...groups].map(([key, groupItems]) => ({
    key,
    label: formatDay(groupItems[0].date),
    items: groupItems,
  }));
}
