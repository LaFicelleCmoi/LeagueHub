"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";

// three.js et le moteur physique (plusieurs centaines de Ko) ne sont téléchargés
// que si le badge doit réellement s'afficher.
const Lanyard = dynamic(() => import("./reactbits/Lanyard"), { ssr: false });

/** Sans WebGL, ou en cas d'erreur 3D, le badge disparaît sans casser la page. */
class BadgeErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Badge 3D décoratif : grand écran uniquement, chargé à l'approche de la zone
// visible, et jamais si l'utilisateur a demandé à réduire les animations.
export function HeroBadge() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    const largeScreen = window.matchMedia("(min-width: 1024px)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!element || !largeScreen || reducedMotion) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className="hidden h-[460px] lg:block">
      {visible && (
        <BadgeErrorBoundary>
          {/* Caméra rapprochée (30 par défaut) : le badge reste lisible dans une colonne étroite. */}
          <Lanyard
            className="h-full"
            position={[0, 0, 18]}
            frontImage="/lanyard/card-front.png"
            backImage="/lanyard/card-back.png"
          />
        </BadgeErrorBoundary>
      )}
    </div>
  );
}
