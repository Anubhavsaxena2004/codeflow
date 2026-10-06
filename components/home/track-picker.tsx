'use client'

import { Check } from 'lucide-react'
import { trackIds, tracks, type Track } from '@/lib/journeys/types'
import { Tilt } from '@/components/effects/tilt'
import { Pill } from '@/components/ui/game'
import { cn } from '@/lib/utils'

const trackArt: Record<
  Track,
  {
    initials: string
    colorGradient: string
    bgTint: string
    borderTint: string
    roleClass: string
  }
> = {
  mern: {
    initials: 'JS',
    colorGradient: 'linear-gradient(135deg, #22c55e, #15803d)',
    bgTint: 'bg-[#22c55e]/10',
    borderTint: 'border-[#22c55e]/30',
    roleClass: 'JavaScript / Node',
  },
  django: {
    initials: 'Py',
    colorGradient: 'linear-gradient(135deg, #0d9488, #0f766e)',
    bgTint: 'bg-[#0f766e]/10',
    borderTint: 'border-[#0f766e]/30',
    roleClass: 'Python / Django',
  },
  spring: {
    initials: 'Jv',
    colorGradient: 'linear-gradient(135deg, #f97316, #c2410c)',
    bgTint: 'bg-[#f97316]/10',
    borderTint: 'border-[#f97316]/30',
    roleClass: 'Java / Spring',
  },
}

export function TrackPicker({
  value,
  onPick,
  journeyCounts,
  layout = 'grid',
}: {
  value: Track | null
  onPick: (track: Track) => void
  journeyCounts: Record<Track, number>
  layout?: 'grid' | 'list'
}) {
  return (
    <div
      className={cn(
        layout === 'list'
          ? 'flex flex-col gap-3'
          : 'grid grid-cols-1 gap-4 lg:grid-cols-3',
      )}
      role="radiogroup"
      aria-label="Tech stack"
    >
      {trackIds.map((track) => {
        const selected = value === track
        const count = journeyCounts[track]
        const art = trackArt[track]
        const techList = tracks[track].tagline.split(' · ')

        if (layout === 'list') {
          return (
            <button
              key={track}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onPick(track)}
              className={cn(
                'group relative flex w-full flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 rounded-2xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]',
                selected
                  ? 'border-[#22c55e] ring-2 ring-[#22c55e] bg-gradient-to-r from-(--cf-surface) to-(--cf-surface-2) shadow-(--elev-2)'
                  : 'border-(--cf-border) bg-(--cf-surface) shadow-xs hover:-translate-y-0.5 hover:border-(--cf-border-strong,var(--cf-border)) hover:bg-(--cf-surface-2)',
              )}
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span
                  className="grid size-12 shrink-0 place-items-center rounded-xl font-display text-base font-black text-white shadow-sm transition-transform group-hover:scale-105"
                  style={{ background: art.colorGradient }}
                  aria-hidden="true"
                >
                  {art.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-base font-black text-(--cf-text)">
                      {tracks[track].label}
                    </span>
                    <span className="text-[11px] font-semibold text-(--cf-muted)">
                      · {count ? `${count} journey${count > 1 ? 's' : ''}` : 'Coming soon'}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {techList.map((tech) => (
                      <Pill
                        key={tech}
                        tone={selected ? 'world' : 'neutral'}
                        size="sm"
                        className="text-[10px] font-semibold py-0.5"
                      >
                        {tech}
                      </Pill>
                    ))}
                  </div>
                </div>
              </div>

              <div className="shrink-0 self-end sm:self-center">
                {selected ? (
                  <Pill tone="success" size="sm" className="font-bold gap-1">
                    <Check className="size-3.5 stroke-[3]" /> Active class
                  </Pill>
                ) : (
                  <span className="rounded-lg border border-(--cf-border) bg-(--cf-surface-2) px-3 py-1 text-xs font-semibold text-(--cf-muted) group-hover:bg-(--cf-surface) group-hover:text-(--cf-text) transition-colors">
                    Select
                  </span>
                )}
              </div>
            </button>
          )
        }

        return (
          <Tilt key={track} max={6} className="h-full rounded-2xl">
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onPick(track)}
              className={cn(
                'group relative flex size-full flex-col items-start justify-between rounded-2xl border bg-(--cf-surface) p-5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]',
                selected
                  ? 'border-[#22c55e] ring-3 ring-[#22c55e] shadow-(--elev-3) bg-gradient-to-b from-(--cf-surface) to-(--cf-surface-2)'
                  : 'border-(--cf-border) shadow-(--elev-1) hover:-translate-y-1 hover:border-(--cf-border-strong,var(--cf-border)) hover:shadow-(--elev-2)',
              )}
            >
              {/* Header: Coloured Emblem and Selected Badge */}
              <div className="flex w-full items-start justify-between gap-3">
                <span
                  className="grid size-12 shrink-0 place-items-center rounded-xl font-display text-base font-black text-white shadow-sm transition-transform group-hover:scale-105"
                  style={{ background: art.colorGradient }}
                  aria-hidden="true"
                >
                  {art.initials}
                </span>

                {selected ? (
                  <div className="flex items-center gap-1.5">
                    <Pill tone="success" size="sm" className="font-bold">
                      Selected
                    </Pill>
                    <span
                      className="grid size-6 place-items-center rounded-full bg-[#16a34a] text-white shadow-xs"
                      aria-hidden="true"
                    >
                      <Check className="size-3.5 stroke-[3]" />
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] font-semibold text-(--cf-muted) group-hover:text-(--cf-text)">
                    {art.roleClass}
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <div className="mt-4 flex-1">
                <span className="block font-display text-xl font-black text-(--cf-text) leading-tight">
                  {tracks[track].label}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-(--cf-muted)">
                  {count
                    ? `${count} journey${count > 1 ? 's' : ''} available`
                    : 'Journey coming soon'}
                </span>

                {/* Tech List Pills */}
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {techList.map((tech) => (
                    <Pill
                      key={tech}
                      tone={selected ? 'world' : 'neutral'}
                      size="sm"
                      className="text-[11px] font-semibold"
                    >
                      {tech}
                    </Pill>
                  ))}
                </div>
              </div>

              {/* Card Footer status */}
              <div className="mt-4 w-full border-t border-(--cf-border) pt-3 text-[11px] font-bold text-(--cf-muted)">
                {selected ? (
                  <span className="text-[#15803d] dark:text-[#86efac]">Active class</span>
                ) : (
                  <span>Click to select stack</span>
                )}
              </div>
            </button>
          </Tilt>
        )
      })}
    </div>
  )
}
