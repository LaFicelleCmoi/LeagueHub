import { CalendarDays, MapPin, Tv, UserRound, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { formatDay, formatTime } from "@/lib/format";
import type { MatchDetail } from "@/lib/types";

const attendanceFormat = new Intl.NumberFormat("fr-FR");

function Row({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="mt-0.5 text-sm">{children}</dd>
      </div>
    </div>
  );
}

// Informations pratiques du match fournies par ESPN : date, stade, affluence, arbitres, diffuseurs.
export function MatchInfo({ detail }: { detail: MatchDetail }) {
  const { match, venue, attendance, officials, broadcasts } = detail;

  return (
    <dl className="divide-y divide-slate-100 dark:divide-slate-800">
      <Row icon={CalendarDays} label="Coup d’envoi">
        {formatDay(match.date)} à {formatTime(match.date)}
      </Row>
      {venue && (
        <Row icon={MapPin} label="Stade">
          {venue.name}
          {venue.city && <span className="text-slate-500 dark:text-slate-400"> · {venue.city}</span>}
        </Row>
      )}
      {attendance !== null && (
        <Row icon={Users} label="Affluence">
          {attendanceFormat.format(attendance)} spectateurs
        </Row>
      )}
      {officials.length > 0 && (
        <Row icon={UserRound} label="Arbitres">
          <ul className="space-y-0.5">
            {officials.map((official) => (
              <li key={`${official.role}-${official.name}`}>
                {official.name}
                {official.role && <span className="text-slate-500 dark:text-slate-400"> · {official.role}</span>}
              </li>
            ))}
          </ul>
        </Row>
      )}
      {broadcasts.length > 0 && (
        <Row icon={Tv} label="Diffusion (selon ESPN, marché américain)">
          {broadcasts.join(", ")}
        </Row>
      )}
    </dl>
  );
}
