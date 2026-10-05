'use client'

import { useEffect, useRef } from 'react'
import { Check, LockKeyhole, Skull } from 'lucide-react'
import { kindIcons, type WorldPalette } from '@/components/journey/level-meta'
import { kindLabels, type LevelProgress } from '@/lib/journeys/types'
import type { LevelSummary } from '@/lib/server/journeys'
import type { LevelState } from './world-map'
import { cn } from '@/lib/utils'

export interface WorldStepperProps {
  levels: { level: LevelSummary; index: number }[]
  selectedId: string
  stateOf: (index: number) => LevelState
  done: Record<string, LevelProgress>
  palette: WorldPalette
  onSelect: (levelId: string) => void
  worldTitle: string
}

export function WorldStepper({
  levels,
  selectedId,
  stateOf,
  done,
  palette,
  onSelect,
  worldTitle,
}: WorldStepperProps) {
  const activeNodeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (activeNodeRef.current) {
      activeNodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [selectedId])

  // Current level index in the journey to know which connectors are filled
  const currentIndex = levels.findIndex(({ index }) => stateOf(index) === 'current')

  return (
    <div className="relative w-full overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
      <ol className="flex min-w-full items-center justify-start gap-0 px-2 sm:justify-center" aria-label={`Levels of ${worldTitle}`}>
        {levels.map(({ level, index }, position) => {
          const state = stateOf(index)
          const isDone = state === 'done' || !!done[level.id]
          const isCurrent = state === 'current'
          const isLocked = state === 'locked'
          const isBoss = !!level.boss
          const active = level.id === selectedId
          const KindIcon = kindIcons[level.kind]

          // Connector is filled if this level and previous are passed or up to current level
          const connectorFilled = position <= (currentIndex >= 0 ? currentIndex : levels.length)

          return (
            <li key={level.id} className="flex shrink-0 items-center">
              {position > 0 && (
                <div
                  aria-hidden="true"
                  className={cn(
                    'h-[3px] w-6 transition-colors duration-300 sm:w-10',
                    connectorFilled ? 'bg-[#22c55e]' : 'bg-(--cf-border)',
                  )}
                />
              )}
              <div className="relative flex flex-col items-center">
                <button
                  ref={active ? activeNodeRef : undefined}
                  type="button"
                  onClick={() => onSelect(level.id)}
                  aria-pressed={active}
                  aria-label={`Level ${index + 1}: ${level.title}${isBoss ? ' (boss)' : ''}, ${isDone ? 'completed' : isCurrent ? 'next up' : isLocked ? 'locked' : 'open'}`}
                  className={cn(
                    'group relative grid place-items-center rounded-full font-extrabold transition-all duration-[var(--dur-fast,160ms)] ease-[var(--ease-pop)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--focus-ring)]',
                    isBoss ? 'size-9' : isCurrent ? 'size-8 ring-2 ring-[#22c55e] ring-offset-2 ring-offset-(--cf-surface)' : 'size-7',
                    active && 'scale-110 ring-4 ring-[#fde047] ring-offset-2 ring-offset-(--cf-surface)',
                  )}
                  style={{
                    background: isLocked
                      ? 'var(--cf-surface-2)'
                      : isBoss
                        ? 'linear-gradient(145deg, #ef4444, #b91c1c)'
                        : isDone
                          ? `linear-gradient(145deg, ${palette.color}, ${palette.deep})`
                          : '#ffffff',
                    color: isLocked ? 'var(--cf-faint)' : !isBoss && !isDone ? palette.deep : '#ffffff',
                    border: isLocked
                      ? '2px solid var(--cf-border)'
                      : !isBoss && !isDone
                        ? `2px solid ${palette.color}`
                        : '2px solid #ffffff',
                  }}
                >
                  {/* Subtle pulse for current */}
                  {isCurrent && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-1 animate-ping rounded-full border border-[#22c55e] opacity-60 motion-reduce:hidden"
                    />
                  )}

                  {isBoss ? (
                    <Skull className="size-4 shrink-0 drop-shadow-sm" />
                  ) : isLocked ? (
                    <LockKeyhole className="size-3 shrink-0" />
                  ) : isDone ? (
                    <Check className="size-3.5 shrink-0 stroke-[3]" />
                  ) : (
                    <span className="font-display text-[11px] font-extrabold">{index + 1}</span>
                  )}

                  {/* Level-kind icon badge */}
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1 -right-1 grid size-3.5 place-items-center rounded-full bg-(--cf-surface) shadow-sm ring-1 ring-black/10 dark:ring-white/20"
                    title={kindLabels[level.kind]}
                  >
                    <KindIcon className="size-2.5 text-(--cf-text)" />
                  </span>
                </button>

                <span
                  className={cn(
                    'mt-1 font-display text-[10px] leading-tight transition-colors',
                    active ? 'font-extrabold text-(--cf-text)' : 'text-(--cf-muted)',
                  )}
                >
                  {isBoss ? 'Boss' : `L${index + 1}`}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
