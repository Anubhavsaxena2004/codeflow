'use client'

import { Star, Check, LockKeyhole, Skull } from 'lucide-react'
import { kindIcons } from '@/components/journey/level-meta'
import type { LevelKind } from '@/lib/journeys/types'
import type { LevelState } from './world-map'
import { cn } from '@/lib/utils'

export interface LevelPinProps {
  number: number
  kind: LevelKind
  state: LevelState
  isBoss?: boolean
  stars?: number
  label?: string
  selected?: boolean
  accentColor?: string
  deepColor?: string
  className?: string
}

export function LevelPin({
  number,
  kind,
  state,
  isBoss = false,
  stars = 0,
  selected = false,
  accentColor = '#22c55e',
  deepColor = '#15803d',
  className,
}: LevelPinProps) {
  const KindIcon = kindIcons[kind]
  const locked = state === 'locked'
  const isCurrent = state === 'current'
  const isDone = state === 'done'

  const sizeClass = isBoss
    ? 'size-14 text-sm'
    : isCurrent
      ? 'size-12 text-sm'
      : locked
        ? 'size-10 text-xs'
        : 'size-10 text-xs'

  return (
    <div className={cn('relative flex origin-center flex-col items-center select-none', className)}>
      {/* Stars on an arc above completed levels */}
      {isDone && (
        <div className="pointer-events-none absolute -top-4 flex items-center gap-0.5">
          {([0, 1, 2] as const).map((idx) => {
            const filled = idx < stars
            const rotation = idx === 0 ? '-rotate-12 translate-y-0.5' : idx === 2 ? 'rotate-12 translate-y-0.5' : '-translate-y-0.5'
            return (
              <Star
                key={idx}
                aria-hidden="true"
                className={cn(
                  'size-3.5 transition-transform',
                  rotation,
                  filled
                    ? 'fill-[#f5b301] text-[#b45309] dark:text-[#f5b301]'
                    : 'fill-none text-black/25 dark:text-white/25 stroke-1',
                )}
              />
            )
          })}
        </div>
      )}

      {/* Pulsing ring for next level (current) */}
      {isCurrent && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 rounded-full animate-ping opacity-60 bg-[#22c55e] [animation-duration:1.6s]"
        />
      )}

      {/* Pin Face */}
      <div
        className={cn(
          'relative grid place-items-center rounded-full border-[3px] font-extrabold shadow-[0_6px_16px_rgb(0_0_0/0.35)] transition-transform duration-[var(--dur-fast,160ms)] ease-[var(--ease-pop)]',
          sizeClass,
          locked
            ? 'border-white/90 bg-slate-200 text-slate-700 shadow-md dark:border-slate-400/60 dark:bg-slate-700 dark:text-slate-200'
            : isBoss
              ? 'border-white text-white shadow-[0_0_20px_rgb(239_68_68/0.45)]'
              : isDone
                ? 'border-white text-white'
                : isCurrent
                  ? 'border-[#22c55e] text-white shadow-[0_0_16px_rgb(34_197_94/0.45)]'
                  : 'border-white text-white',
          selected && 'ring-4 ring-[#fde047] ring-offset-2 ring-offset-black/20',
        )}
        style={{
          background: locked
            ? undefined
            : isBoss
              ? 'linear-gradient(145deg, #ef4444, #b91c1c)'
              : isCurrent
                ? 'linear-gradient(145deg, #22c55e, #15803d)'
                : isDone
                  ? `linear-gradient(145deg, ${accentColor}, ${deepColor})`
                  : '#ffffff',
          color: !locked && !isBoss && !isCurrent && !isDone ? deepColor : '#ffffff',
        }}
      >
        {isBoss ? (
          <Skull className="size-6 shrink-0 drop-shadow-sm" />
        ) : locked ? (
          <LockKeyhole className="size-4 shrink-0 text-slate-700 dark:text-slate-200" />
        ) : isDone ? (
          <Check className="size-5 shrink-0 stroke-[3]" />
        ) : isCurrent ? (
          <KindIcon className="size-5 shrink-0 drop-shadow-sm" />
        ) : (
          <span className="font-display font-extrabold">{number}</span>
        )}
      </div>

      {/* Badges below */}
      {isBoss && (
        <span className="pointer-events-none mt-1 rounded-full bg-[#b91c1c] px-2 py-0.5 font-display text-[9px] font-extrabold tracking-wider text-white shadow-md ring-1 ring-white/30">
          BOSS
        </span>
      )}
      {isCurrent && (
        <span className="pointer-events-none mt-1 rounded-full bg-[#15803d] px-2 py-0.5 font-display text-[9px] font-extrabold tracking-wider text-white shadow-md ring-1 ring-white/30">
          PLAY
        </span>
      )}
    </div>
  )
}
