import { useEffect, useState } from "react";
import type { ClubRef, TeamForm } from "./types";

export type TeamFormStatus = { state: "loading" } | { state: "error" } | { state: "ready"; form: TeamForm };

/** Pendant un match du club, ou juste avant, sa fiche est relue régulièrement. */
const LIVE_REFRESH = 30_000;
const BEFORE_KICKOFF = 15 * 60_000;

function followsLive(form: TeamForm, now: number): boolean {
  return form.live !== null || (form.next !== null && Date.parse(form.next.date) - now <= BEFORE_KICKOFF);
}

/** Forme, match en cours et prochain match d'un club, tenus à jour pendant ses matchs. */
export function useTeamForm(club: ClubRef | null, attempt = 0): TeamFormStatus {
  const league = club?.league;
  const teamId = club?.team.id;
  const [status, setStatus] = useState<TeamFormStatus>({ state: "loading" });

  useEffect(() => {
    if (!league || !teamId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let loaded = false;

    const load = async () => {
      // Onglet masqué : on attend qu'il redevienne visible pour relire la fiche.
      if (loaded && document.visibilityState !== "visible") {
        timer = setTimeout(load, LIVE_REFRESH);
        return;
      }
      try {
        const response = await fetch(`/api/teams/${league}/${teamId}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const form = (await response.json()) as TeamForm;
        loaded = true;
        setStatus({ state: "ready", form });
        if (followsLive(form, Date.now())) timer = setTimeout(load, LIVE_REFRESH);
      } catch {
        if (controller.signal.aborted) return;
        // Une fiche déjà affichée reste visible : on retente simplement plus tard.
        if (loaded) timer = setTimeout(load, LIVE_REFRESH);
        else setStatus({ state: "error" });
      }
    };

    setStatus({ state: "loading" });
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [league, teamId, attempt]);

  return status;
}
