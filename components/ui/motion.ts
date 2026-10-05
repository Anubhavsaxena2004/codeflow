import type { Transition, Variants } from 'framer-motion'

export const dur = {
  press: 0.09,
  fast: 0.16,
  base: 0.24,
  slow: 0.36,
  beat: 0.6,
  count: 0.9,
} as const

export const ease = {
  out: [0.22, 1, 0.36, 1] as const,
  in: [0.55, 0, 1, 0.45] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  pop: [0.34, 1.56, 0.64, 1] as const,
} as const

export const springs = {
  snappy: { type: 'spring', stiffness: 500, damping: 32 } as const,
  bouncy: { type: 'spring', stiffness: 420, damping: 16 } as const,
  gentle: { type: 'spring', stiffness: 140, damping: 20 } as const,
} as const

export const stagger = 0.05

export function fadeUp(index = 0): Variants {
  return {
    initial: { opacity: 0, y: 14 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: dur.base,
        ease: ease.out,
        delay: index * stagger,
      },
    },
    exit: {
      opacity: 0,
      y: 10,
      transition: {
        duration: dur.fast,
        ease: ease.in,
      },
    },
  }
}

export const popIn: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: dur.base,
      ease: ease.pop,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    transition: {
      duration: dur.fast,
      ease: ease.in,
    },
  },
}
