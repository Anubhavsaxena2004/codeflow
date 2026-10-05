import { BookOpen, Bug, Castle, Building2, Database, FlaskConical, Hammer, House, Network, SquareTerminal, Star, Trees, FileCode2, type LucideIcon } from 'lucide-react'
import type { LevelKind, WorldTheme } from '@/lib/journeys/types'
import { cn } from '@/lib/utils'

export const kindIcons: Record<LevelKind, LucideIcon> = {
  explore: BookOpen,
  command: SquareTerminal,
  edit: FileCode2,
  bugfix: Bug,
  build: Hammer,
  architecture: Network,
}

/**
 * Map colours per world theme. `color` is the world's banner and badge; the rest paint its island
 * (grass top, cliff, foliage). Hex values, so they work in SVG and in both light and dark mode.
 */
export interface WorldPalette {
  icon: LucideIcon
  color: string
  /** A darker shade of color, for gradients and text on light backgrounds. */
  deep: string
  top: [string, string]
  cliff: [string, string]
  leaf: [string, string]
}

export const worldThemes: Record<WorldTheme, WorldPalette> = {
  village: { icon: House, color: '#16a34a', deep: '#15803d', top: ['#9be15d', '#3fb950'], cliff: ['#b7793a', '#7a4a1f'], leaf: ['#4ade80', '#15803d'] },
  forest: { icon: Trees, color: '#0d9488', deep: '#0f766e', top: ['#6ee7b7', '#10b981'], cliff: ['#a0643a', '#6b3f1d'], leaf: ['#34d399', '#047857'] },
  dungeon: { icon: Database, color: '#ea580c', deep: '#c2410c', top: ['#a78bfa', '#6d28d9'], cliff: ['#5b3f8c', '#2e1d54'], leaf: ['#fb923c', '#c2410c'] },
  castle: { icon: Castle, color: '#7c3aed', deep: '#6d28d9', top: ['#c4b5fd', '#8b5cf6'], cliff: ['#6a4bb0', '#3b2470'], leaf: ['#4ade80', '#166534'] },
  lab: { icon: FlaskConical, color: '#2563eb', deep: '#1d4ed8', top: ['#67e8f9', '#06b6d4'], cliff: ['#3a6f8f', '#1e3a52'], leaf: ['#5eead4', '#0f766e'] },
  city: { icon: Building2, color: '#db2777', deep: '#be185d', top: ['#93c5fd', '#3b82f6'], cliff: ['#475a8c', '#26315a'], leaf: ['#4ade80', '#15803d'] },
}

export function Stars({ count, className }: { count: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[#f5b301]', className)} aria-label={`${count} of 3 stars`}>
      {[0, 1, 2].map((index) => (
        <Star key={index} aria-hidden className={cn('size-3', index < count ? 'fill-current' : 'opacity-35')} />
      ))}
    </span>
  )
}
