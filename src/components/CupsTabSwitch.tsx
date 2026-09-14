"use client";

import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Sparkles, Trophy } from "lucide-react";
import { setCupsTab, useCupsTab } from "@/lib/cups-tab";

const noopSubscribe = () => () => {};

// Étincelles lancées dans 8 directions autour de la médaille quand on active l'onglet.
const SPARK_COLORS = ["bg-amber-400", "bg-yellow-300", "bg-orange-400", "bg-amber-500"];
const SPARKS = Array.from({ length: 8 }, (_, index) => {
  const angle = (index / 8) * Math.PI * 2 + Math.PI / 8;
  const distance = index % 2 ? 14 : 20;
  return {
    style: {
      "--spark-x": `${Math.round(Math.cos(angle) * distance)}px`,
      "--spark-y": `${Math.round(Math.sin(angle) * distance)}px`,
    } as CSSProperties,
    color: SPARK_COLORS[index % SPARK_COLORS.length],
  };
});

interface TrackProps {
  on: boolean;
  animated: boolean;
  /** Numéro de la gerbe d'étincelles en cours, 0 quand il n'y en a pas. */
  burst: number;
  onSparksEnd: () => void;
}

function Track({ on, animated, burst, onSparksEnd }: TrackProps) {
  // Pas de transition avant la première image : le choix mémorisé ne doit pas s'animer au chargement.
  const motion = animated ? "duration-500 motion-reduce:transition-none" : "transition-none";

  return (
    <span
      aria-hidden
      className="relative inline-block h-7 w-13 shrink-0 rounded-full group-focus-visible:ring-2 group-focus-visible:ring-amber-500 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-white dark:group-focus-visible:ring-offset-slate-950"
    >
      <span
        className={`absolute inset-0 overflow-hidden rounded-full bg-slate-200 ring-1 transition-shadow dark:bg-slate-800 ${motion} ${
          on
            ? "shadow-[0_2px_12px_-2px_rgb(245_158_11/0.7)] ring-amber-500/60"
            : "shadow-[inset_0_1px_3px_rgb(15_23_42/0.2)] ring-slate-300 dark:ring-slate-700"
        }`}
      >
        {/* Rail doré de l'onglet actif. */}
        <span
          className={`absolute inset-0 bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 transition-opacity ${motion} ${
            on ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* Ligne médiane et rond central : clin d'œil au terrain quand l'onglet est éteint. */}
        <span className={`absolute inset-0 transition-opacity ${motion} ${on ? "opacity-0" : "opacity-100"}`}>
          <span className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-slate-400/50 dark:bg-slate-600" />
          <span className="absolute top-1/2 left-1/2 size-3.5 -translate-1/2 rounded-full border border-slate-400/50 dark:border-slate-600" />
        </span>
        <Sparkles
          className={`absolute top-1/2 left-1.5 size-3 -translate-y-1/2 text-amber-950/60 transition-[opacity,scale] ${motion} ${
            on ? "scale-100 opacity-100" : "scale-50 opacity-0"
          }`}
        />
        {on && (
          <span className="animate-switch-shine absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent motion-reduce:hidden" />
        )}
      </span>

      {/* Médaille : glisse, tourne sur elle-même et passe à l'or. */}
      <span
        className={`absolute top-0.5 left-0.5 grid size-6 place-items-center rounded-full shadow-md ring-1 transition-[translate,rotate,scale,background-color,box-shadow] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-active:scale-90 ${motion} ${
          on
            ? "translate-x-6 rotate-[360deg] bg-slate-900 ring-amber-300/80"
            : "translate-x-0 rotate-0 bg-white ring-slate-300 dark:bg-slate-200 dark:ring-slate-400"
        }`}
      >
        <Trophy
          className={`size-3.5 transition-colors ${motion} ${on ? "fill-amber-300/30 text-amber-300" : "text-slate-400"}`}
        />
      </span>

      {on && burst > 0 && (
        <span
          key={burst}
          onAnimationEnd={onSparksEnd}
          className="pointer-events-none absolute top-1/2 left-[38px] motion-reduce:hidden"
        >
          {SPARKS.map((spark, index) => (
            <span
              key={index}
              style={spark.style}
              className={`animate-switch-spark absolute -top-0.5 -left-0.5 size-1 rounded-full ${spark.color}`}
            />
          ))}
        </span>
      )}
    </span>
  );
}

function useSwitchState() {
  const on = useCupsTab();
  const [animated, setAnimated] = useState(false);
  const [burst, setBurst] = useState(0);
  const [sparking, setSparking] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const toggle = () => {
    if (!on) {
      setBurst((count) => count + 1);
      setSparking(true);
    }
    setCupsTab(!on);
  };

  return {
    on,
    toggle,
    track: (
      <Track on={on} animated={animated} burst={sparking ? burst : 0} onSparksEnd={() => setSparking(false)} />
    ),
  };
}

/** Interrupteur qui affiche ou masque l'onglet « Coupes nationales » dans le menu. */
export function CupsTabSwitch({ variant = "compact" }: { variant?: "compact" | "row" }) {
  const { on, toggle, track } = useSwitchState();

  if (variant === "row") {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggle}
        className="group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left font-medium outline-none hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <span className="grid size-6 place-items-center">
          <Trophy className={`size-5 transition-colors ${on ? "text-amber-500" : "text-slate-400"}`} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          Onglet Coupes nationales
          <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
            FA Cup, Copa del Rey, Coppa Italia, DFB-Pokal, Coupe de France
          </span>
        </span>
        {track}
      </button>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={toggle}
      title={on ? "Masquer l’onglet Coupes" : "Afficher l’onglet Coupes nationales"}
      className="group inline-flex items-center gap-2.5 rounded-full py-1 pr-1 pl-3 text-sm font-semibold outline-none transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <span
        className={
          on
            ? "bg-gradient-to-r from-amber-600 to-yellow-500 bg-clip-text text-transparent"
            : "text-slate-600 dark:text-slate-300"
        }
      >
        <span className="sr-only">Onglet </span>Coupes<span className="sr-only"> nationales</span>
      </span>
      {track}
    </button>
  );
}

/** Rappel sur les pages Coupes quand l'onglet est masqué dans le menu. */
export function CupsTabNotice() {
  const on = useCupsTab();
  // Rien avant l'hydratation : le serveur ne connaît pas le choix du visiteur.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!hydrated || on) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <p>L’onglet Coupes est masqué dans le menu. Activez-le pour y revenir en un clic.</p>
      <CupsTabSwitch />
    </div>
  );
}
