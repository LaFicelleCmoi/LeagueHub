import { TIME_ZONE } from "@/lib/format";
import type { FormGame, MatchDetail, MatchOutcome } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { TeamLogo } from "./TeamLogo";

const OUTCOMES: Record<MatchOutcome, { letter: string; label: string; badge: string; score: string }> = {
  win: { letter: "V", label: "Victoire", badge: "bg-emerald-600 text-white", score: "text-emerald-700 dark:text-emerald-400" },
  draw: { letter: "N", label: "Match nul", badge: "bg-slate-400 text-white dark:bg-slate-500", score: "text-slate-600 dark:text-slate-300" },
  loss: { letter: "D", label: "Défaite", badge: "bg-red-600 text-white", score: "text-red-700 dark:text-red-400" },
};

const shortDate = new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, day: "numeric", month: "short" });
const yearFormat = new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, year: "2-digit" });

/** « 4 oct. », ou « 4 oct. 25 » pour un match d'une autre année. */
function formDate(date: string): string {
  const value = new Date(date);
  const sameYear = yearFormat.format(value) === yearFormat.format(new Date());
  return sameYear ? shortDate.format(value) : `${shortDate.format(value)} ${yearFormat.format(value)}`;
}
const longDate = new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, day: "numeric", month: "short", year: "numeric" });

function FormRow({ game }: { game: FormGame }) {
  const outcome = game.outcome ? OUTCOMES[game.outcome] : null;
  return (
    <li className="flex items-center gap-2 py-1.5 text-sm">
      <span aria-hidden className={`grid size-5 shrink-0 place-items-center rounded text-[10px] font-bold ${outcome?.badge ?? "bg-slate-200 dark:bg-slate-700"}`}>
        {outcome?.letter ?? "–"}
      </span>
      <span className="sr-only">{outcome?.label ?? "Résultat inconnu"}</span>
      <span className="w-16 shrink-0 text-xs text-slate-500 dark:text-slate-400">{formDate(game.date)}</span>
      <span className="text-xs text-slate-400">{game.home ? "vs" : "chez"}</span>
      <TeamLogo team={{ id: game.opponent.name, shortName: game.opponent.name, ...game.opponent }} size={16} />
      <span className="min-w-0 flex-1 truncate">{game.opponent.name}</span>
      <span className="hidden shrink-0 text-[11px] text-slate-400 sm:inline">{game.competition}</span>
      <span className={`w-9 shrink-0 text-right font-semibold tabular-nums ${outcome?.score ?? ""}`}>
        {game.goalsFor}–{game.goalsAgainst}
      </span>
    </li>
  );
}

// Avant-match : forme des deux équipes et confrontations directes, d'après ESPN.
export function MatchPreview({ detail }: { detail: MatchDetail }) {
  const { match, form, headToHead } = detail;
  const hasForm = form.some((line) => line.games.length > 0);

  if (!hasForm && !headToHead) {
    return <EmptyState>ESPN ne fournit pas encore d’avant-match pour cette rencontre.</EmptyState>;
  }

  const h2hTotal = headToHead ? headToHead.wins.home + headToHead.draws + headToHead.wins.away : 0;

  return (
    <div className="space-y-6">
      {hasForm && (
        <section aria-labelledby="preview-form">
          <h3 id="preview-form" className="text-sm font-semibold">
            Forme du moment
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">5 derniers matchs, du plus récent au plus ancien</p>
          <div className="mt-3 grid gap-5 sm:grid-cols-2">
            {form.map((line) => (
              <div key={line.side} className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  <TeamLogo team={line.team} size={20} />
                  <span className="min-w-0 flex-1 truncate">{line.team.name}</span>
                  <span className="flex gap-0.5" aria-label={`Forme : ${line.games.map((game) => (game.outcome ? OUTCOMES[game.outcome].label : "inconnu")).join(", ")}`}>
                    {line.games.map((game) => (
                      <span
                        key={game.id}
                        aria-hidden
                        className={`grid size-5 place-items-center rounded text-[10px] font-bold ${game.outcome ? OUTCOMES[game.outcome].badge : "bg-slate-200 dark:bg-slate-700"}`}
                      >
                        {game.outcome ? OUTCOMES[game.outcome].letter : "–"}
                      </span>
                    ))}
                  </span>
                </p>
                <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
                  {line.games.map((game) => (
                    <FormRow key={game.id} game={game} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {headToHead && headToHead.games.length > 0 && (
        <section aria-labelledby="preview-h2h">
          <h3 id="preview-h2h" className="text-sm font-semibold">
            Face-à-face
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {h2hTotal} {h2hTotal > 1 ? "confrontations récentes" : "confrontation récente"}
          </p>

          <div className="mt-3 grid grid-cols-3 items-end gap-2 text-center">
            {[
              { label: match.home.team.shortName, value: headToHead.wins.home, tone: "text-slate-900 dark:text-white" },
              { label: headToHead.draws > 1 ? "nuls" : "nul", value: headToHead.draws, tone: "text-slate-500 dark:text-slate-400" },
              { label: match.away.team.shortName, value: headToHead.wins.away, tone: "text-amber-600 dark:text-amber-400" },
            ].map((item) => (
              <div key={item.label}>
                <p className={`text-2xl font-bold tabular-nums ${item.tone}`}>{item.value}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {item.label === match.home.team.shortName || item.label === match.away.team.shortName
                    ? `victoire${item.value > 1 ? "s" : ""} ${item.label}`
                    : item.label}
                </p>
              </div>
            ))}
          </div>
          {h2hTotal > 0 && (
            <div aria-hidden className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <span className="bg-slate-900 dark:bg-white" style={{ width: `${(headToHead.wins.home / h2hTotal) * 100}%` }} />
              <span className="bg-slate-300 dark:bg-slate-600" style={{ width: `${(headToHead.draws / h2hTotal) * 100}%` }} />
              <span className="bg-amber-500" style={{ width: `${(headToHead.wins.away / h2hTotal) * 100}%` }} />
            </div>
          )}

          <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {headToHead.games.map((game) => (
              <li key={game.id} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 py-2 text-sm">
                <span className={`flex min-w-0 items-center justify-end gap-2 ${game.winner === "home" ? "font-semibold" : ""}`}>
                  <span className="truncate">{game.home.name}</span>
                  <TeamLogo team={{ id: game.home.name, shortName: game.home.name, abbreviation: "", ...game.home }} size={18} />
                </span>
                <span className="flex flex-col items-center">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold tabular-nums dark:bg-slate-800">
                    {game.homeScore ?? "–"}–{game.awayScore ?? "–"}
                  </span>
                  <span className="mt-0.5 text-[10px] text-slate-400">{longDate.format(new Date(game.date))}</span>
                </span>
                <span className={`flex min-w-0 items-center gap-2 ${game.winner === "away" ? "font-semibold" : ""}`}>
                  <TeamLogo team={{ id: game.away.name, shortName: game.away.name, abbreviation: "", ...game.away }} size={18} />
                  <span className="truncate">{game.away.name}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
