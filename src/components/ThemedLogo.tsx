"use client";

import Image from "next/image";
import { useState } from "react";

// ESPN publie des variantes éclaircies des logos pour les fonds sombres :
// on affiche celle qui correspond au thème du système. Quelques clubs n'en
// ont pas (404) : on revient alors au logo standard.
export function ThemedLogo({ light, dark, size }: { light: string; dark: string | null; size: number }) {
  const [darkFailed, setDarkFailed] = useState(false);
  const style = { width: size, height: size };

  if (!dark || darkFailed) {
    return <Image src={light} alt="" width={size} height={size} style={style} className="shrink-0 object-contain" />;
  }

  return (
    <>
      <Image src={light} alt="" width={size} height={size} style={style} className="shrink-0 object-contain dark:hidden" />
      <Image
        src={dark}
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
