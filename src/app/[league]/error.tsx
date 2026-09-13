"use client";

import { ErrorState } from "@/components/ErrorState";

export default function LeagueError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState onRetry={reset} />;
}
