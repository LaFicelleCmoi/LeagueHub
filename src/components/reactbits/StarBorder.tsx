// Composant React Bits : https://reactbits.dev/animations/star-border
// Licence MIT + Commons Clause. Variante TypeScript + Tailwind copiée depuis le registre.
// Adaptations LeagueHub :
// - `className` et `innerClassName` remplaçables sans conflit de classes Tailwind ;
// - étoiles masquées si l'utilisateur a activé « réduire les animations » ;
// - keyframes `star-movement-*` déclarées dans src/app/globals.css (Tailwind 4).
/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';

type StarBorderProps<T extends React.ElementType> = React.ComponentPropsWithoutRef<T> & {
  as?: T;
  className?: string;
  innerClassName?: string;
  children?: React.ReactNode;
  color?: string;
  speed?: React.CSSProperties['animationDuration'];
  thickness?: number;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
};

const StarBorder = <T extends React.ElementType = 'button'>({
  as,
  className = 'inline-block rounded-[20px]',
  innerClassName = 'text-center text-[16px] py-[16px] px-[26px] rounded-[20px]',
  color = 'white',
  speed = '6s',
  thickness = 1,
  backgroundColor = '#000000',
  textColor = '#ffffff',
  borderColor = '#222222',
  children,
  ...rest
}: StarBorderProps<T>) => {
  const Component = as || 'button';

  return (
    <Component
      className={`relative overflow-hidden ${className}`}
      {...(rest as any)}
      style={{
        padding: `${thickness}px 0`,
        ...(rest as any).style
      }}
    >
      <div
        className="absolute w-[300%] h-[50%] opacity-70 bottom-[-11px] right-[-250%] rounded-full animate-star-movement-bottom z-0 motion-reduce:hidden"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed
        }}
      ></div>
      <div
        className="absolute w-[300%] h-[50%] opacity-70 top-[-10px] left-[-250%] rounded-full animate-star-movement-top z-0 motion-reduce:hidden"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed
        }}
      ></div>
      <div
        className={`relative z-1 border ${innerClassName}`}
        style={{ background: backgroundColor, color: textColor, borderColor }}
      >
        {children}
      </div>
    </Component>
  );
};

export default StarBorder;
