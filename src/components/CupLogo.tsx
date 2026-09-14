import { cupLogo, type Cup } from "@/lib/cups";
import { ThemedLogo } from "./ThemedLogo";

export function CupLogo({ cup, size }: { cup: Cup; size: number }) {
  return <ThemedLogo light={cupLogo(cup)} dark={cup.darkLogo ? cupLogo(cup, "dark") : null} size={size} />;
}
