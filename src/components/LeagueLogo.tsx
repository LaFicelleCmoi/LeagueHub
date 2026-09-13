import { leagueLogo, type League } from "@/lib/leagues";
import { ThemedLogo } from "./ThemedLogo";

export function LeagueLogo({ league, size }: { league: League; size: number }) {
  return <ThemedLogo light={leagueLogo(league)} dark={leagueLogo(league, "dark")} size={size} />;
}
