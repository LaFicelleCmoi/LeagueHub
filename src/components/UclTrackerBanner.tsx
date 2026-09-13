import { ArrowUpRight, CalendarDays, Gamepad2, Radio, Star, Trophy } from "lucide-react";
import { UCL_TRACKER_URL } from "@/lib/external-links";
import ShinyText from "./reactbits/ShinyText";
import SpotlightCard from "./reactbits/SpotlightCard";
import StarBorder from "./reactbits/StarBorder";

const FEATURES = [
  { icon: Radio, label: "Scores en direct" },
  { icon: Trophy, label: "Classement & phase finale" },
  { icon: CalendarDays, label: "Calendrier" },
  { icon: Gamepad2, label: "Jeu & simulateur" },
];

// Ciel étoilé en CSS (positions fixes : rendu identique côté serveur et navigateur).
const STARFIELD = [
  "radial-gradient(1.5px 1.5px at 6% 18%, rgba(255,255,255,0.9), transparent)",
  "radial-gradient(1px 1px at 14% 72%, rgba(255,255,255,0.7), transparent)",
  "radial-gradient(1.5px 1.5px at 27% 38%, rgba(255,255,255,0.6), transparent)",
  "radial-gradient(1px 1px at 38% 88%, rgba(255,255,255,0.8), transparent)",
  "radial-gradient(1px 1px at 46% 12%, rgba(255,255,255,0.7), transparent)",
  "radial-gradient(1.5px 1.5px at 58% 64%, rgba(255,255,255,0.5), transparent)",
  "radial-gradient(1px 1px at 67% 28%, rgba(255,255,255,0.8), transparent)",
  "radial-gradient(1.5px 1.5px at 79% 82%, rgba(255,255,255,0.6), transparent)",
  "radial-gradient(1px 1px at 88% 44%, rgba(255,255,255,0.9), transparent)",
  "radial-gradient(1px 1px at 95% 10%, rgba(255,255,255,0.7), transparent)",
].join(", ");

// Étoiles scintillantes placées dans la zone vide entre le texte et le bouton (grand écran uniquement).
const TWINKLES = [
  "left-[50%] top-[8%] size-2 [animation-delay:0ms]",
  "left-[62%] top-[16%] size-3 [animation-delay:700ms]",
  "left-[66%] bottom-[16%] size-2.5 [animation-delay:1400ms]",
  "right-[3%] bottom-[8%] size-2 [animation-delay:2100ms]",
];

// Bannière vers le tracker de la Ligue des champions 2026-2027 (site indépendant, nouvel onglet).
export function UclTrackerBanner() {
  return (
    <section aria-labelledby="ucl-tracker-heading">
      <SpotlightCard
        spotlightColor="rgba(129, 140, 248, 0.28)"
        className="group rounded-3xl border border-indigo-400/20 bg-[radial-gradient(120%_130%_at_0%_0%,#3730a3_0%,#1e1b4b_45%,#020617_100%)] text-white shadow-xl shadow-indigo-950/25"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: STARFIELD }} />

        {/* Anneaux et grande étoile, clin d'œil au ballon étoilé de la compétition. */}
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full border border-white/10" />
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-64 rounded-full border border-white/10" />
        <Star
          aria-hidden
          className="pointer-events-none absolute -right-4 top-4 size-48 fill-white/[0.04] text-white/10 transition-transform duration-1000 group-hover:rotate-[18deg] motion-reduce:transition-none"
        />
        {TWINKLES.map((position) => (
          <Star
            key={position}
            aria-hidden
            className={`pointer-events-none absolute hidden animate-pulse fill-indigo-100 text-indigo-100 motion-reduce:animate-none lg:block ${position}`}
          />
        ))}

        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-10">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-100 backdrop-blur">
              <Star className="size-3.5 fill-amber-300 text-amber-300" aria-hidden />
              Saison 2026-2027
            </p>

            <h2 id="ucl-tracker-heading" className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              <ShinyText text="Ligue des champions" color="#ffffff" shineColor="#a5b4fc" speed={3} />
              <span className="mt-1 block text-lg font-medium text-indigo-200 sm:text-xl">
                Le tracker de la saison, sur un site dédié
              </span>
            </h2>

            <p className="mt-3 max-w-xl text-sm text-indigo-100/80 sm:text-base">
              Scores en direct, classement de la phase de ligue, tableau final et simulateur : tout pour suivre la
              LDC match après match.
            </p>

            <ul className="mt-5 flex flex-wrap gap-2">
              {FEATURES.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/15"
                >
                  <Icon className="size-3.5 text-indigo-200" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-start gap-2 lg:items-end">
            <StarBorder
              as="a"
              href={UCL_TRACKER_URL}
              target="_blank"
              rel="noopener noreferrer"
              color="#c7d2fe"
              speed="4s"
              thickness={2}
              className="inline-block rounded-2xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-white"
              innerClassName="flex items-center gap-2 rounded-2xl px-5 py-3 text-base font-semibold shadow-lg shadow-indigo-950/40"
              backgroundColor="#ffffff"
              textColor="#1e1b4b"
              borderColor="rgba(255, 255, 255, 0.5)"
            >
              Ouvrir le tracker LDC
              <ArrowUpRight
                className="size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden
              />
              <span className="sr-only">(nouvel onglet)</span>
            </StarBorder>
            <p className="text-xs text-indigo-200/70">ldc-2026-2027.vercel.app · projet indépendant</p>
          </div>
        </div>
      </SpotlightCard>
    </section>
  );
}
