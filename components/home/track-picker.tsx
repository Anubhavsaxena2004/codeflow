'use client'

import { Check } from 'lucide-react'
import { trackIds, tracks, type Track } from '@/lib/journeys/types'
import { cn } from '@/lib/utils'

const trackArt: Record<Track, { initials: string; color: string }> = {
  mern: { initials: 'JS', color: 'bg-[#16a34a]' },
  django: { initials: 'Py', color: 'bg-[#0f766e]' },
  spring: { initials: 'Jv', color: 'bg-[#ea580c]' },
}

export function TrackPicker({ value, onPick, journeyCounts }: { value: Track | null; onPick: (track: Track) => void; journeyCounts: Record<Track, number> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Tech stack">
      {trackIds.map((track) => {
        const selected = value === track
        const count = journeyCounts[track]
        return (
          <button
            key={track}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onPick(track)}
            className={cn(
              'relative flex flex-col items-start gap-3 rounded-2xl border bg-(--cf-surface) p-4 text-left shadow-(--cf-shadow) transition hover:-translate-y-0.5 hover:shadow-md',
              selected ? 'border-[#16a34a] ring-2 ring-[#16a34a]/30' : 'border-(--cf-border)',
            )}
          >
            <span className={cn('grid size-10 place-items-center rounded-xl text-sm font-bold text-white', trackArt[track].color)}>{trackArt[track].initials}</span>
            <span>
              <span className="block text-base font-semibold text-(--cf-text)">{tracks[track].label}</span>
              <span className="mt-0.5 block text-xs text-(--cf-muted)">{tracks[track].tagline}</span>
            </span>
            <span className="text-[11px] font-medium text-(--cf-muted)">{count ? `${count} journey${count > 1 ? 's' : ''}` : 'Journey coming soon'}</span>
            {selected && <Check aria-hidden className="absolute right-3 top-3 size-4 text-[#16a34a]" />}
          </button>
        )
      })}
    </div>
  )
}
