"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Medal,
  Radio,
  Scale,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { UCL_TRACKER_URL, UECL_TRACKER_URL, UEL_TRACKER_URL } from "@/lib/external-links";
import ShinyText from "./reactbits/ShinyText";
import SpotlightCard from "./reactbits/SpotlightCard";
import StarBorder from "./reactbits/StarBorder";

// Chaque coupe a sa palette. Les classes sont écrites en entier : Tailwind ne devine pas celles
// qu'on assemblerait à partir d'un nom de couleur.
interface Theme {
  card: string;
  spotlight: `rgba(${number}, ${number}, ${number}, ${number})`;
  kicker: string;
  shine: string;
  subtitle: string;
  body: string;
  chipIcon: string;
  twinkle: string;
  border: string;
  buttonText: string;
  buttonShadow: string;
  host: string;
  dot: string;
}

interface Slide {
  id: string;
  /** Nom court, pour le sélecteur sous la bannière. */
  short: string;
  title: string;
  subtitle: string;
  description: string;
  features: { icon: LucideIcon; label: string }[];
  icon: LucideIcon;
  /** Logo de la coupe, en version blanche à fond transparent : il se pose directement sur la bannière. */
  logo: { src: string; width: number; height: number };
  cta: string;
  href: string;
  theme: Theme;
}

const SLIDES: Slide[] = [
  {
    id: "ldc",
    short: "LDC",
    title: "Ligue des champions",
    subtitle: "Le tracker de la saison, sur un site dédié",
    description:
      "Scores en direct, classement de la phase de ligue, tableau final et simulateur : tout pour suivre la LDC match après match.",
    features: [
      { icon: Radio, label: "Scores en direct" },
      { icon: Trophy, label: "Classement & phase finale" },
      { icon: CalendarDays, label: "Calendrier" },
      { icon: Gamepad2, label: "Jeu & simulateur" },
    ],
    icon: Star,
    logo: { src: "/coupes-europe/ligue-des-champions.png", width: 300, height: 288 },
    cta: "Ouvrir le tracker LDC",
    href: UCL_TRACKER_URL,
    theme: {
      card: "border-indigo-400/20 bg-[radial-gradient(120%_130%_at_0%_0%,#3730a3_0%,#1e1b4b_45%,#020617_100%)] shadow-indigo-950/25",
      spotlight: "rgba(129, 140, 248, 0.28)",
      kicker: "text-indigo-100",
      shine: "#a5b4fc",
      subtitle: "text-indigo-200",
      body: "text-indigo-100/80",
      chipIcon: "text-indigo-200",
      twinkle: "fill-indigo-100 text-indigo-100",
      border: "#c7d2fe",
      buttonText: "#1e1b4b",
      buttonShadow: "shadow-indigo-950/40",
      host: "text-indigo-200/70",
      dot: "bg-indigo-500",
    },
  },
  {
    id: "uel",
    short: "Europa",
    title: "Ligue Europa",
    subtitle: "Le tracker de la saison, sur un site dédié",
    description:
      "Scores en direct, journée en cours et classement de la phase de ligue : la Ligue Europa match après match, avec son comparateur.",
    features: [
      { icon: Radio, label: "Scores en direct" },
      { icon: Trophy, label: "Classement par zone" },
      { icon: ChartColumn, label: "Saison en chiffres" },
      { icon: Scale, label: "Comparateur" },
    ],
    icon: Trophy,
    logo: { src: "/coupes-europe/ligue-europa.png", width: 188, height: 288 },
    cta: "Ouvrir le tracker Europa",
    href: UEL_TRACKER_URL,
    theme: {
      card: "border-orange-400/20 bg-[radial-gradient(120%_130%_at_0%_0%,#c2410c_0%,#431407_42%,#09090b_100%)] shadow-orange-950/25",
      spotlight: "rgba(251, 146, 60, 0.28)",
      kicker: "text-orange-100",
      shine: "#fdba74",
      subtitle: "text-orange-200",
      body: "text-orange-100/80",
      chipIcon: "text-orange-200",
      twinkle: "fill-orange-100 text-orange-100",
      border: "#fed7aa",
      buttonText: "#431407",
      buttonShadow: "shadow-orange-950/40",
      host: "text-orange-200/70",
      dot: "bg-orange-500",
    },
  },
  {
    id: "uecl",
    short: "Conférence",
    title: "Ligue Conférence",
    subtitle: "Le tracker de la saison, sur un site dédié",
    description:
      "Scores en direct, journée en cours et classement de la phase de ligue : la Ligue Conférence match après match, avec son comparateur.",
    features: [
      { icon: Radio, label: "Scores en direct" },
      { icon: Trophy, label: "Classement par zone" },
      { icon: ChartColumn, label: "Saison en chiffres" },
      { icon: Scale, label: "Comparateur" },
    ],
    icon: Medal,
    logo: { src: "/coupes-europe/ligue-conference.png", width: 289, height: 288 },
    cta: "Ouvrir le tracker Conférence",
    href: UECL_TRACKER_URL,
    theme: {
      card: "border-teal-400/20 bg-[radial-gradient(120%_130%_at_0%_0%,#0f766e_0%,#042f2e_42%,#020617_100%)] shadow-teal-950/25",
      spotlight: "rgba(45, 212, 191, 0.26)",
      kicker: "text-teal-100",
      shine: "#5eead4",
      subtitle: "text-teal-200",
      body: "text-teal-100/80",
      chipIcon: "text-teal-200",
      twinkle: "fill-teal-100 text-teal-100",
      border: "#99f6e4",
      buttonText: "#042f2e",
      buttonShadow: "shadow-teal-950/40",
      host: "text-teal-200/70",
      dot: "bg-teal-500",
    },
  },
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

function TrackerSlide({ slide }: { slide: Slide }) {
  const { theme, icon: Icon } = slide;
  const headingId = `tracker-${slide.id}-heading`;

  return (
    <SpotlightCard
      spotlightColor={theme.spotlight}
      className={`group h-full rounded-3xl border text-white shadow-xl ${theme.card}`}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: STARFIELD }} />

      {/* Anneaux derrière le logo de la coupe. */}
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full border border-white/10" />
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-64 rounded-full border border-white/10" />
      {TWINKLES.map((position) => (
        <Star
          key={position}
          aria-hidden
          className={`pointer-events-none absolute hidden animate-pulse motion-reduce:animate-none lg:block ${theme.twinkle} ${position}`}
        />
      ))}

      {/* Mobile : logo, texte, bouton, dans cet ordre. Grand écran : le texte à gauche, le logo au-dessus du
          bouton à droite, le tout centré en hauteur. */}
      <div className="relative grid h-full grid-cols-1 gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:content-center lg:gap-x-10">
        {/* Les logos officiels sont noirs : ils sont fournis en blanc (l'orange d'Europa et le vert de la
            Conférence sont conservés), sans quoi ils se perdraient sur la bannière sombre. */}
        <Image
          src={slide.logo.src}
          alt=""
          width={slide.logo.width}
          height={slide.logo.height}
          className="h-16 w-auto justify-self-start drop-shadow-lg sm:h-20 lg:col-start-2 lg:row-start-1 lg:h-28 lg:self-end lg:justify-self-center"
        />

        <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-center">
          <p
            className={`inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur ${theme.kicker}`}
          >
            <Icon className="size-3.5 fill-amber-300 text-amber-300" aria-hidden />
            Saison 2026-2027
          </p>

          <h2 id={headingId} className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            <ShinyText text={slide.title} color="#ffffff" shineColor={theme.shine} speed={3} />
            <span className={`mt-1 block text-lg font-medium sm:text-xl ${theme.subtitle}`}>{slide.subtitle}</span>
          </h2>

          <p className={`mt-3 max-w-xl text-sm sm:text-base ${theme.body}`}>{slide.description}</p>

          <ul className="mt-5 flex flex-wrap gap-2">
            {slide.features.map(({ icon: FeatureIcon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/15"
              >
                <FeatureIcon className={`size-3.5 ${theme.chipIcon}`} aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col items-start gap-2 lg:col-start-2 lg:row-start-2 lg:items-center lg:self-start">
          <StarBorder
            as="a"
            href={slide.href}
            target="_blank"
            rel="noopener noreferrer"
            color={theme.border}
            speed="4s"
            thickness={2}
            className="inline-block rounded-2xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-white"
            innerClassName={`flex items-center gap-2 rounded-2xl px-5 py-3 text-base font-semibold shadow-lg ${theme.buttonShadow}`}
            backgroundColor="#ffffff"
            textColor={theme.buttonText}
            borderColor="rgba(255, 255, 255, 0.5)"
          >
            {slide.cta}
            <ArrowUpRight
              className="size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
              aria-hidden
            />
            <span className="sr-only">(nouvel onglet)</span>
          </StarBorder>
          <p className={`text-xs ${theme.host}`}>ldc-2026-2027.vercel.app · projet indépendant</p>
        </div>
      </div>
    </SpotlightCard>
  );
}

const PILL =
  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:focus-visible:outline-white";
const ARROW =
  "grid size-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:outline-white";

/**
 * Bannières vers les trackers des trois coupes d'Europe (site indépendant, nouvel onglet), en carrousel.
 * Le défilement est celui du navigateur (scroll-snap) : le doigt, la molette et le clavier fonctionnent
 * sans code. Pas de lecture automatique : un lien qui bouge sous le curseur est un lien qu'on rate.
 */
export function EuropeanTrackers() {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const goTo = (index: number) => {
    const element = track.current;
    if (!element) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollTo({ left: index * element.clientWidth, behavior: reduce ? "auto" : "smooth" });
  };

  const onScroll = () => {
    const element = track.current;
    if (element) setActive(Math.round(element.scrollLeft / element.clientWidth));
  };

  return (
    <section aria-roledescription="carousel" aria-label="Trackers des coupes d'Europe">
      <div
        ref={track}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SLIDES.map((slide, index) => (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-labelledby={`tracker-${slide.id}-heading`}
            // Une diapositive hors champ ne doit pas recevoir le focus : on y tabulerait sans la voir.
            inert={index !== active}
            className="w-full shrink-0 snap-center [scroll-snap-stop:always]"
          >
            <TrackerSlide slide={slide} />
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div role="group" aria-label="Choisir une coupe" className="flex flex-wrap gap-1.5">
          {SLIDES.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => goTo(index)}
              aria-current={index === active ? "true" : undefined}
              className={`${PILL} ${
                index === active
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <span aria-hidden className={`size-2 rounded-full ${slide.theme.dot}`} />
              {slide.short}
            </button>
          ))}
        </div>

        {/* Au toucher, on glisse du doigt et les pastilles suffisent : les flèches sont pour la souris. */}
        <div className="hidden gap-1.5 sm:flex">
          <button type="button" onClick={() => goTo((active - 1 + SLIDES.length) % SLIDES.length)} className={ARROW}>
            <ChevronLeft className="size-4" aria-hidden />
            <span className="sr-only">Coupe précédente</span>
          </button>
          <button type="button" onClick={() => goTo((active + 1) % SLIDES.length)} className={ARROW}>
            <ChevronRight className="size-4" aria-hidden />
            <span className="sr-only">Coupe suivante</span>
          </button>
        </div>
      </div>

      {/* Annonce le changement de diapositive aux lecteurs d'écran. */}
      <p className="sr-only" aria-live="polite">
        {`Diapositive ${active + 1} sur ${SLIDES.length} : ${SLIDES[active].title}`}
      </p>
    </section>
  );
}
