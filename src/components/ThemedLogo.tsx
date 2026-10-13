"use client";

import Image from "next/image";
import { useState } from "react";
import { espnImage } from "@/lib/espn-image";

// ESPN publie des variantes éclaircies des logos pour les fonds sombres :
// on affiche celle qui correspond au thème du système. Quelques clubs n'en
// ont pas (404) : on revient alors au logo standard.
export function ThemedLogo({ light, dark, size }: { light: string; dark: string | null; size: number }) {
  const [darkFailed, setDarkFailed] = useState(false);
  const style = { width: size, height: size };
  // Le double de la taille affichée, pour les écrans haute densité ; redimensionné par ESPN.
  const lightSrc = espnImage(light, size * 2);
  const darkSrc = dark ? espnImage(dark, size * 2) : null;

  if (!darkSrc || darkFailed) {
    return <Image src={lightSrc} alt="" width={size} height={size} unoptimized style={style} className="shrink-0 object-contain" />;
  }

  return (
    <>
      <Image src={lightSrc} alt="" width={size} height={size} unoptimized style={style} className="shrink-0 object-contain dark:hidden" />
      <Image
        src={darkSrc}
        unoptimized
        alt=""
        width={size}
        height={size}
        style={style}
        onError={() => setDarkFailed(true)}
        className="hidden shrink-0 object-contain dark:block"
      />
    </>
  );
}
