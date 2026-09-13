"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { renderFavoriteCard } from "@/lib/favorite-card";
import { useFavoriteClub } from "@/lib/favorite-club";

// three.js et le moteur physique (plusieurs centaines de Ko) ne sont téléchargés
// que lorsque le badge approche de la zone visible.
const Lanyard = dynamic(() => import("./reactbits/Lanyard"), { ssr: false });

const DEFAULT_FRONT = "/lanyard/card-front.png";

class BadgeErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Badge fixe : animations réduites, WebGL indisponible ou erreur 3D. */
function StaticBadge({ front }: { front: string }) {
  return (
    <div className="flex h-full flex-col items-center">
      <div className="h-14 w-4 bg-[linear-gradient(90deg,#c9a052_0_18%,#13295b_18%_82%,#c9a052_82%)] sm:h-20" />
      <div className="-mt-1 h-4 w-7 rounded-md border-4 border-slate-400 dark:border-slate-500" />
      <Image
        src={front}
        alt=""
        width={839}
        height={1266}
        unoptimized
        className="-mt-0.5 h-auto w-32 -rotate-3 rounded-xl shadow-xl ring-1 ring-black/10 sm:w-40"
      />
    </div>
  );
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function HeroBadge() {
  const ref = useRef<HTMLDivElement>(null);
  const favorite = useFavoriteClub();
  const [near, setNear] = useState(false);
  const [mode, setMode] = useState<"3d" | "static">("3d");
  // Caméra plus proche que la valeur par défaut (30) : le badge reste lisible dans un bloc étroit,
  // et encore plus proche sous 1024 px où le bloc est moins haut.
  const [cameraZ, setCameraZ] = useState(18);
  const [front, setFront] = useState(DEFAULT_FRONT);

  // Chargement à l'approche de la zone visible, sur tous les écrans.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // 3D seulement si WebGL est disponible et les animations autorisées (suivi en direct du réglage).
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const largeScreen = window.matchMedia("(min-width: 1024px)");
    const webgl = supportsWebGL();
    const update = () => {
      setMode(webgl && !reducedMotion.matches ? "3d" : "static");
      setCameraZ(largeScreen.matches ? 18 : 14);
    };
    update();
    reducedMotion.addEventListener("change", update);
    largeScreen.addEventListener("change", update);
    return () => {
      reducedMotion.removeEventListener("change", update);
      largeScreen.removeEventListener("change", update);
    };
  }, []);

  // Recto personnalisé avec le club favori.
  useEffect(() => {
    if (!favorite) {
      setFront(DEFAULT_FRONT);
      return;
    }
    let cancelled = false;
    renderFavoriteCard(favorite).then(
      (url) => !cancelled && setFront(url),
      () => !cancelled && setFront(DEFAULT_FRONT),
    );
    return () => {
      cancelled = true;
    };
  }, [favorite]);

  const fallback = <StaticBadge front={front} />;

  return (
    <div ref={ref} aria-hidden="true" className="h-[270px] sm:h-[320px] lg:h-[400px]">
      {near &&
        (mode === "static" ? (
          fallback
        ) : (
          <BadgeErrorBoundary fallback={fallback}>
            {/* key : la caméra n'est lue qu'à la création du canvas. */}
            <Lanyard
              key={cameraZ}
              className="h-full"
              position={[0, 0, cameraZ]}
              frontImage={front}
              backImage="/lanyard/card-back.png"
            />
          </BadgeErrorBoundary>
        ))}
    </div>
  );
}
