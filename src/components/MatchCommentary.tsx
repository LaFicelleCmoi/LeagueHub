import type { MatchDetail } from "@/lib/types";
import { EmptyState } from "./EmptyState";

// Commentaire minute par minute d'ESPN, publié en anglais uniquement.
export function MatchCommentary({ detail }: { detail: MatchDetail }) {
  if (detail.commentary.length === 0) {
    return (
      <EmptyState>
        {detail.match.state === "pre"
          ? "Le commentaire commencera avec le match."
          : "ESPN ne fournit pas de commentaire pour ce match."}
      </EmptyState>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Commentaire fourni par ESPN, en anglais, du plus récent au plus ancien.
      </p>
      <ol lang="en" className="space-y-2.5">
        {detail.commentary.map((line, index) => (
          <li key={`${line.minute}-${index}`} className="flex gap-3 text-sm">
            <span className="w-12 shrink-0 pt-px text-right text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
              {line.minute}
            </span>
            <p className="min-w-0 text-slate-700 dark:text-slate-300">{line.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
