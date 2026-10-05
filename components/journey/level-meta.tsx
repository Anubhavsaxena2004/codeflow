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

/** Map colours per world theme: a soft tint for the island, a strong colour for its badge and path. */
export const worldThemes: Record<WorldTheme, { icon: LucideIcon; badge: string; tint: string; ring: string; text: string }> = {
  village: { icon: House, badge: 'bg-[#16a34a]', tint: 'from-[#dcfce7] to-[#f0fdf4]', ring: 'ring-[#86efac]', text: 'text-[#166534]' },
  forest: { icon: Trees, badge: 'bg-[#0d9488]', tint: 'from-[#ccfbf1] to-[#f0fdfa]', ring: 'ring-[#5eead4]', text: 'text-[#115e59]' },
  dungeon: { icon: Database, badge: 'bg-[#d97706]', tint: 'from-[#fef3c7] to-[#fffbeb]', ring: 'ring-[#fcd34d]', text: 'text-[#92400e]' },
  castle: { icon: Castle, badge: 'bg-[#7c3aed]', tint: 'from-[#ede9fe] to-[#f5f3ff]', ring: 'ring-[#c4b5fd]', text: 'text-[#5b21b6]' },
  lab: { icon: FlaskConical, badge: 'bg-[#2563eb]', tint: 'from-[#dbeafe] to-[#eff6ff]', ring: 'ring-[#93c5fd]', text: 'text-[#1e40af]' },
  city: { icon: Building2, badge: 'bg-[#db2777]', tint: 'from-[#fce7f3] to-[#fdf2f8]', ring: 'ring-[#f9a8d4]', text: 'text-[#9d174d]' },
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
