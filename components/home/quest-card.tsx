'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check, Circle, LockKeyhole, Skull, Star, Sparkles } from 'lucide-react'
import { kindIcons, type WorldPalette } from '@/components/journey/level-meta'
import { kindLabels, type LevelProgress } from '@/lib/journeys/types'
import type { LevelSummary, ProjectSummary } from '@/lib/server/journeys'
import type { LevelState } from './world-map'
import { cn } from '@/lib/utils'
import { Tilt } from '@/components/effects/tilt'
import { GameButton, Pill } from '@/components/ui/game'
import { WorldStepper } from './world-stepper'

export interface QuestCardProps {
  journey: ProjectSummary
  selected: LevelSummary
  selectedIndex: number
  state: LevelState
  row?: LevelProgress
  palette: WorldPalette
  worldIndex: number
  worldTitle: string
  inWorldLevels: { level: LevelSummary; index: number }[]
  worldDoneCount: number
  done: Record<string, LevelProgress>
  stateOf: (index: number) => LevelState
  onSelectLevel: (levelId: string) => void
}

export function QuestCard({
  journey,
  selected,
  selectedIndex,
  state,
  row,
  palette,
  worldIndex,
  worldTitle,
  inWorldLevels,
  worldDoneCount,
  done,
  stateOf,
  onSelectLevel,
}: QuestCardProps) {
  const isBoss = !!selected.boss
  const isLocked = state === 'locked'
  const isDone = state === 'done' || !!row
  const isNext = state === 'current'
  const KindIcon = kindIcons[selected.kind]
  const earnedStars = row?.stars ?? 0

  return (
    <section aria-label="Quest details" className="relative w-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={selected.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          <Tilt max={5} className="overflow-hidden rounded-3xl">
            <div
              className={cn(
                'relative overflow-hidden rounded-3xl border bg-(--cf-panel) shadow-(--cf-shadow) transition-all duration-300',
                isBoss
                  ? 'border-[#ef4444] shadow-[0_0_28px_rgba(239,68,68,0.28)] dark:shadow-[0_0_36px_rgba(185,28,28,0.4)] animate-[pulse_3s_ease-in-out_infinite] motion-reduce:animate-none'
                  : isNext
                    ? 'border-[#22c55e] glow-border'
                    : isLocked
                      ? 'border-(--cf-border) opacity-85 saturate-[0.7]'
                      : 'border-(--cf-border)',
              )}
            >
              {/* Header strip */}
              <div
                className="relative overflow-hidden p-5 text-white sm:p-6"
                style={{
                  background: isBoss
                    ? 'linear-gradient(135deg, #b91c1c, #ef4444 80%, rgba(239, 68, 68, 0.3))'
                    : `linear-gradient(135deg, ${palette.deep}, ${palette.color} 75%, transparent 100%)`,
                }}
              >
                {/* Diagonal warning-stripe header band for Boss */}
                {isBoss && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-15"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(45deg, #000 0, #000 12px, transparent 12px, transparent 24px)',
                    }}
                  />
                )}

                <div aria-hidden className="pointer-events-none absolute -right-6 -top-10 size-44 rounded-full bg-white/10 blur-xl" />
                <div aria-hidden className="pointer-events-none absolute -bottom-16 right-20 size-36 rounded-full bg-white/10 blur-lg" />

                <div className="relative flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <span
                      className={cn(
                        'grid size-12 shrink-0 place-items-center rounded-2xl shadow-md ring-1 ring-white/40',
                        isBoss ? 'bg-[#991b1b] text-white' : 'bg-white/20 text-white',
                      )}
                    >
                      {isBoss ? <Skull className="size-6 drop-shadow" /> : <KindIcon className="size-6 drop-shadow" />}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-white/80">
                        <span>World {worldIndex + 1} · {worldTitle}</span>
                        <span>•</span>
                        <span>Level {selectedIndex + 1}</span>
                      </div>
                      <h3 className="font-display text-xl font-extrabold tracking-tight text-white drop-shadow-sm sm:text-2xl">
                        {selected.title}
                      </h3>
                      {selected.summary && (
                        <p className="mt-1 text-[13px] leading-relaxed text-white/90 sm:text-sm">
                          {selected.summary}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Badges / Pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-display font-extrabold text-white backdrop-blur shadow-sm ring-1 ring-white/30">
                      <KindIcon className="size-3.5" />
                      <span>{kindLabels[selected.kind]}</span>
                    </span>
                    {isBoss && (
                      <span className="flex items-center gap-1 rounded-full bg-[#b91c1c] px-2.5 py-1 text-[11px] font-display font-extrabold text-white shadow-md ring-1 ring-white/40">
                        <Skull className="size-3.5" />
                        <span>BOSS</span>
                      </span>
                    )}
                    {isDone && (
                      <span className="flex items-center gap-1 rounded-full bg-[#15803d] px-2.5 py-1 text-[11px] font-display font-extrabold text-white shadow-md ring-1 ring-white/40">
                        <Check className="size-3.5 stroke-[3]" />
                        <span>Completed</span>
                      </span>
                    )}
                    {isLocked && (
                      <span className="flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-display font-extrabold text-white/90 shadow-md ring-1 ring-white/20">
                        <LockKeyhole className="size-3.5" />
                        <span>Locked</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* World Progress bar in header */}
                <div className="relative mt-4 flex items-center gap-3 text-[12px] font-bold text-white/90">
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-black/25">
                    <span
                      className="block h-full rounded-full bg-white transition-[width] duration-500 ease-out"
                      style={{ width: `${(worldDoneCount / inWorldLevels.length) * 100}%` }}
                    />
                  </span>
                  <span>
                    {worldDoneCount}/{inWorldLevels.length} levels in this world
                  </span>
                </div>
              </div>

              {/* World Stepper */}
              <div className="border-b border-(--cf-border) bg-(--cf-surface-2)/60 px-4 py-3 sm:px-6">
                <WorldStepper
                  levels={inWorldLevels}
                  selectedId={selected.id}
                  stateOf={stateOf}
                  done={done}
                  palette={palette}
                  onSelect={onSelectLevel}
                  worldTitle={worldTitle}
                />
              </div>

              {/* Card Body */}
              <div className="p-5 sm:p-6">
                {/* Rewards preview row */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-(--cf-border) bg-(--cf-surface-2)/50 p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {([0, 1, 2] as const).map((idx) => {
                        const filled = idx < earnedStars
                        return (
                          <Star
                            key={idx}
                            aria-hidden="true"
                            className={cn(
                              'size-5 transition-transform',
                              filled
                                ? 'fill-[#f5b301] text-[#b45309] dark:text-[#f5b301]'
                                : 'fill-none text-(--cf-border) stroke-[1.5]',
                            )}
                          />
                        )
                      })}
                    </div>
                    <span className="text-xs font-bold text-(--cf-muted)">Up to 3 ★</span>
                  </div>

                  {selected.xp != null && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ede9fe] px-3 py-1 font-display text-xs font-extrabold text-[#6d28d9] shadow-sm dark:bg-[#7c3aed]/25 dark:text-[#c4b5fd]">
                      <Sparkles className="size-3.5" /> +<span className="num">{selected.xp}</span> XP
                    </span>
                  )}
                </div>

                {/* Your mission */}
                <div className="mt-5">
                  <h4 className="text-[11px] font-display font-extrabold uppercase tracking-wider text-(--cf-muted)">
                    Your mission
                  </h4>
                  <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    {selected.tasks.map((task) => (
                      <li
                        key={task}
                        className="flex items-start gap-2.5 rounded-xl border border-(--cf-border)/60 bg-(--cf-panel) p-2.5 text-[13px] leading-relaxed text-(--cf-text)"
                      >
                        {row ? (
                          <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#16a34a] stroke-[3]" />
                        ) : (
                          <Circle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-(--cf-faint)" />
                        )}
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action CTA footer */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-(--cf-border) pt-4">
                  <div>
                    {isLocked && (
                      <span className="flex items-center gap-2 text-xs font-semibold text-(--cf-muted)">
                        <LockKeyhole className="size-4 shrink-0" /> Pass the levels before it
                      </span>
                    )}
                  </div>

                  {isLocked ? (
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      className="inline-flex h-11 cursor-not-allowed items-center gap-2 rounded-xl bg-slate-300 px-5 text-sm font-display font-extrabold text-slate-500 opacity-60 dark:bg-slate-700 dark:text-slate-400"
                    >
                      <LockKeyhole className="size-4" /> Locked
                    </button>
                  ) : (
                    <Link
                      href={`/learn/${journey.id}/${selected.id}`}
                      className={cn(
                        'inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-display font-extrabold text-white shadow-md transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2',
                        isBoss && !row
                          ? 'bg-gradient-to-r from-[#ef4444] to-[#b91c1c] shadow-[0_4px_14px_rgba(239,68,68,0.4)] hover:brightness-110'
                          : row
                            ? 'border border-(--cf-border) bg-(--cf-surface-2) text-(--cf-text) hover:bg-(--cf-surface)'
                            : 'btn-shine-idle bg-[#16a34a] shadow-[0_4px_14px_rgba(22,163,74,0.4)] hover:bg-[#15803d]',
                      )}
                    >
                      <span>{row ? 'Replay' : isBoss ? 'Enter battle' : 'Start level'}</span>
                      <ArrowRight className="size-4" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </Tilt>
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
