import { useReducedMotion, type Transition } from 'framer-motion';

export const EASE = [0.16, 1, 0.3, 1] as const;

export interface ScreenMotion {
  initial: Record<string, number | string>;
  animate: Record<string, number | string>;
  exit: Record<string, number | string>;
  transition: Transition;
}

/** Transisi antar-layar: fade + translateY (<= 12px) + sedikit blur, <= 250 ms. Reduced motion: fade saja. */
export function useScreenMotion(): ScreenMotion {
  const reduce = useReducedMotion();
  if (reduce) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.15 },
    };
  }
  return {
    initial: { opacity: 0, y: 10, filter: 'blur(4px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, y: -6, filter: 'blur(3px)' },
    transition: { duration: 0.22, ease: EASE },
  };
}
