'use client';

// Composant React Bits : https://reactbits.dev/text-animations/count-up
// Licence MIT + Commons Clause. Variante TypeScript + Tailwind copiée depuis le registre.
// Adaptations LeagueHub :
// - valeur finale rendue côté serveur (lisible sans JavaScript et par les moteurs de recherche) ;
// - pas d'animation si l'utilisateur a activé « réduire les animations » ;
// - animation à durée fixe au lieu d'un ressort très amorti, qui restait plusieurs secondes sous la valeur finale.

import { animate, useInView, useMotionValue, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';

interface CountUpProps {
  to: number;
  from?: number;
  direction?: 'up' | 'down';
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  separator?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

export default function CountUp({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 2,
  className = '',
  startWhen = true,
  separator = '',
  onStart,
  onEnd
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const motionValue = useMotionValue(direction === 'down' ? to : from);


  const isInView = useInView(ref, { once: true, margin: '0px' });

  const getDecimalPlaces = (num: number): number => {
    const str = num.toString();
    if (str.includes('.')) {
      const decimals = str.split('.')[1];
      if (parseInt(decimals) !== 0) {
        return decimals.length;
      }
    }
    return 0;
  };

  const maxDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(to));

  const formatValue = useCallback(
    (latest: number) => {
      const hasDecimals = maxDecimals > 0;

      const options: Intl.NumberFormatOptions = {
        useGrouping: !!separator,
        minimumFractionDigits: hasDecimals ? maxDecimals : 0,
        maximumFractionDigits: hasDecimals ? maxDecimals : 0
      };

      const formattedNumber = Intl.NumberFormat('en-US', options).format(latest);

      return separator ? formattedNumber.replace(/,/g, separator) : formattedNumber;
    },
    [maxDecimals, separator]
  );

  useEffect(() => {
    if (ref.current) {
      // Sans animation, on garde directement la valeur finale.
      const start = direction === 'down' ? to : from;
      const end = direction === 'down' ? from : to;
      ref.current.textContent = formatValue(prefersReducedMotion ? end : start);
    }
  }, [from, to, direction, formatValue, prefersReducedMotion]);

  useEffect(() => {
    if (isInView && startWhen && !prefersReducedMotion) {
      if (typeof onStart === 'function') {
        onStart();
      }

      let controls: ReturnType<typeof animate> | undefined;
      const timeoutId = setTimeout(() => {
        // Durée fixe : le compteur s'arrête exactement sur la valeur réelle.
        controls = animate(motionValue, direction === 'down' ? from : to, { duration, ease: [0.16, 1, 0.3, 1] });
      }, delay * 1000);

      const durationTimeoutId = setTimeout(
        () => {
          if (typeof onEnd === 'function') {
            onEnd();
          }
        },
        delay * 1000 + duration * 1000
      );

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(durationTimeoutId);
        controls?.stop();
      };
    }
  }, [isInView, startWhen, motionValue, direction, from, to, delay, onStart, onEnd, duration, prefersReducedMotion]);

  useEffect(() => {
    const unsubscribe = motionValue.on('change', (latest: number) => {
      if (ref.current) {
        ref.current.textContent = formatValue(latest);
      }
    });

    return () => unsubscribe();
  }, [motionValue, formatValue]);

  // Valeur finale rendue côté serveur, remplacée par l'animation une fois la page chargée.
  return (
    <span className={className} ref={ref}>
      {formatValue(direction === 'down' ? from : to)}
    </span>
  );
}
