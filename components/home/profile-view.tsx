'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Flame,
  Shield,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import { achievementsFor, indexProgress, rankFor, streakDays } from '@/lib/journeys/progress'
import { tracks, trackIds, type Track } from '@/lib/journeys/types'
import type { ProjectSummary } from '@/lib/server/journeys'
import { useLearner } from '@/lib/use-learner'
import { ThemeToggle } from '@/components/theme-toggle'
import { GamePanel, RankEmblem, SegmentedProgress, StatTile, gameButtonClasses } from '@/components/ui/game'
import { LoadingState, Skeleton } from '@/components/ui/states'
import { cn } from '@/lib/utils'
import { AchievementMedal } from './achievement-medal'
import { GithubCard } from './github-card'
import { Mascot } from './mascot'
import { TrackPicker } from './track-picker'

function CountUpNumber({ value }: { value: number }) {
  const shouldReduceMotion = useReducedMotion()
  const [displayValue, setDisplayValue] = useState(shouldReduceMotion ? value : 0)

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(value)
      return
    }
    const duration = 800
    const startTime = performance.now()
    let frameId: number
    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(easeProgress * value))
      if (progress < 1) {
        frameId = requestAnimationFrame(step)
      }
    }
    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [value, shouldReduceMotion])

  return <span className="num">{displayValue}</span>
}

export function ProfileView({ journeys }: { journeys: ProjectSummary[] }) {
  const { session, track, setTrack, levels, ready } = useLearner()
  const signedIn = session.status === 'signed-in'

  const totalXp = levels.reduce((sum, row) => sum + row.xp, 0)
  const rank = rankFor(totalXp)
  const byProject = indexProgress(levels)
  const allAchievements = achievementsFor(journeys, levels)
  const earned = allAchievements.filter((item) => item.current >= item.target)
  const journeyCounts = Object.fromEntries(
    trackIds.map((id) => [id, journeys.filter((item) => item.track === id).length]),
  ) as Record<Track, number>
  const started = journeys.filter((journey) => byProject[journey.id] || journey.track === track)
  const streak = streakDays(levels)
  const totalStars = levels.reduce((sum, row) => sum + (row.stars ?? 0), 0)
  const levelsCompleted = levels.length

  if (!ready) {
    return (
      <main className="min-h-dvh bg-(--cf-bg) px-4 py-6 text-(--cf-text) md:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              className="flex w-fit items-center gap-1.5 text-sm font-semibold text-(--cf-muted) hover:text-(--cf-text)"
            >
              <ArrowLeft className="size-4" /> Back to the map
            </Link>
            <ThemeToggle className="size-8 rounded-full border border-(--cf-border) bg-(--cf-surface) text-(--cf-muted) hover:bg-(--cf-surface-2) hover:text-(--cf-text)" />
          </div>

          <LoadingState label="Loading player profile…">
            <div className="flex flex-col gap-6">
              {/* Skeleton Hero */}
              <div className="relative overflow-hidden rounded-3xl border border-(--cf-border) bg-(--cf-surface) shadow-(--elev-2)">
                <div className="h-24 sm:h-28 w-full bg-(--cf-surface-2)" />
                <div className="px-5 pb-6 pt-0 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 sm:-mt-12 mb-4">
                    <Skeleton shape="circle" className="size-[72px] sm:size-[96px] ring-4 ring-(--cf-surface)" />
                    <div className="flex-1 space-y-2">
                      <Skeleton shape="line" className="h-7 w-48" />
                      <Skeleton shape="line" className="h-4 w-64" />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-2 max-w-md">
                    <Skeleton shape="line" className="h-3 w-32" />
                    <Skeleton shape="line" className="h-2.5 w-full" />
                  </div>
                </div>
              </div>

              {/* Skeleton Stats */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-(--cf-border) bg-(--cf-surface) p-4 space-y-2">
                    <Skeleton shape="line" className="h-3 w-16" />
                    <Skeleton shape="line" className="h-6 w-20" />
                  </div>
                ))}
              </div>

              {/* Skeleton Grid */}
              <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-2xl border border-(--cf-border) bg-(--cf-surface) p-5 space-y-4">
                  <Skeleton shape="line" className="h-5 w-36" />
                  <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} shape="block" className="h-24 w-full rounded-xl" />
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-(--cf-border) bg-(--cf-surface) p-5 space-y-4">
                  <Skeleton shape="line" className="h-5 w-32" />
                  <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} shape="circle" className="size-16 mx-auto" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </LoadingState>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-(--cf-bg) px-4 py-6 text-(--cf-text) md:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex w-fit items-center gap-1.5 text-sm font-semibold text-(--cf-muted) hover:text-(--cf-text)"
          >
            <ArrowLeft className="size-4" /> Back to the map
          </Link>
          <ThemeToggle className="size-8 rounded-full border border-(--cf-border) bg-(--cf-surface) text-(--cf-muted) hover:bg-(--cf-surface-2) hover:text-(--cf-text)" />
        </div>

        {/* Hero: Player Card */}
        <GamePanel tone="raised" padding="none" className="relative overflow-hidden">
          {/* Banner gradient from purple to brand green */}
          <div
            className="h-24 sm:h-28 w-full"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 40%, #22c55e 100%)',
            }}
            aria-hidden="true"
          />

          <div className="relative px-5 pb-6 pt-0 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 sm:-mt-12 mb-4">
              {/* Avatar with 3px purple gradient ring & overlapping 40px RankEmblem */}
              <div className="relative shrink-0 w-fit">
                <div
                  className="size-[72px] sm:size-[96px] rounded-full p-[3px] shadow-(--elev-2)"
                  style={{
                    background: 'linear-gradient(135deg, #a855f7, #6d28d9, #22c55e)',
                  }}
                >
                  <div className="size-full overflow-hidden rounded-full bg-(--cf-surface-2) grid place-items-center">
                    <Mascot className="size-full" />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 sm:bottom-0 sm:right-0">
                  <RankEmblem rank={rank.rank} size={40} />
                </div>
              </div>

              {/* Player details */}
              <div className="min-w-0 flex-1">
                {signedIn ? (
                  <>
                    <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl sm:text-3xl font-extrabold text-(--cf-text)">
                      <span>{session.user.name}</span>
                      {session.user.isAdmin && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#ede9fe] px-2 py-0.5 text-[11px] font-semibold text-[#5b21b6] dark:bg-[#7c3aed]/25 dark:text-[#ddd6fe]">
                          <Shield className="size-3" /> Admin
                        </span>
                      )}
                    </h1>
                    <p className="text-xs sm:text-sm text-(--cf-muted)">{session.user.email}</p>
                  </>
                ) : (
                  <>
                    <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-(--cf-text)">
                      Guest
                    </h1>
                    <p className="text-xs sm:text-sm text-(--cf-muted)">
                      Progress is saved in this browser only.{' '}
                      <Link
                        href="/register?next=/profile"
                        className="font-semibold text-[#16a34a] underline"
                      >
                        Create an account
                      </Link>{' '}
                      to keep it.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* SegmentedProgress showing XP into current rank */}
            <div className="mt-3 rounded-xl border border-(--cf-border) bg-(--cf-surface-2) p-3">
              <div className="flex items-center justify-between text-xs font-semibold text-(--cf-muted) mb-1.5">
                <span className="font-display font-bold text-(--cf-text)">
                  Rank <span className="num">{rank.rank}</span> progress
                </span>
                <span className="num font-bold text-(--cf-text)">
                  {rank.into} / {rank.size} XP
                </span>
              </div>
              <SegmentedProgress
                label="Rank progress"
                value={rank.into}
                max={rank.size}
                segments={5}
              />
            </div>
          </div>
        </GamePanel>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile
            icon={<Sparkles className="size-5" />}
            label="Total XP"
            value={<CountUpNumber value={totalXp} />}
            tone="xp"
          />
          <StatTile
            icon={<Trophy className="size-5" />}
            label="Current rank"
            value={<CountUpNumber value={rank.rank} />}
            tone="default"
          />
          <StatTile
            icon={<Star className="size-5 fill-current" />}
            label="Stars earned"
            value={<CountUpNumber value={totalStars} />}
            tone="star"
          />
          <StatTile
            icon={<Flame className="size-5 fill-current" />}
            label="Day streak"
            value={<CountUpNumber value={streak} />}
            tone="streak"
          />
          <StatTile
            icon={<CheckCircle2 className="size-5" />}
            label="Levels passed"
            value={<CountUpNumber value={levelsCompleted} />}
            tone="success"
          />
        </div>

        {/* Two-column layout on Desktop (1024px and up), single-column on mobile */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column: Tech stack and Journeys */}
          <div className="flex flex-col gap-6">
            <GamePanel tone="default" title="Tech stack">
              <p className="mb-4 text-sm text-(--cf-muted)">
                The map shows journeys for this stack, and challenges open in its language.
              </p>
              {ready ? (
                <TrackPicker
                  value={track}
                  onPick={(next) => void setTrack(next)}
                  journeyCounts={journeyCounts}
                />
              ) : (
                <p className="text-sm text-(--cf-muted)">Loading…</p>
              )}
            </GamePanel>

            <GamePanel tone="default" title="Journeys">
              <div className="flex flex-col gap-3">
                {started.length === 0 && (
                  <p className="text-sm text-(--cf-muted)">Pick a stack to see its journeys.</p>
                )}
                {started.map((journey) => {
                  const done = byProject[journey.id] ?? {}
                  const passed = journey.levels.filter((level) => done[level.id])
                  const stars = passed.reduce((sum, level) => sum + (done[level.id]?.stars ?? 0), 0)
                  const percent = Math.round((passed.length / journey.levels.length) * 100)
                  return (
                    <div
                      key={journey.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--cf-border) bg-(--cf-surface-2) p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-sm font-bold text-(--cf-text)">
                          {journey.title}{' '}
                          <span className="text-xs font-normal text-(--cf-muted)">
                            · {tracks[journey.track].label}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2.5">
                          <span className="h-1.5 w-32 sm:w-40 overflow-hidden rounded-full bg-(--cf-track)">
                            <span
                              className="block h-full rounded-full bg-linear-to-r from-[#22c55e] to-[#15803d]"
                              style={{ width: `${percent}%` }}
                            />
                          </span>
                          <span className="text-xs font-semibold text-(--cf-muted)">
                            <span className="num">{passed.length}</span>/
                            <span className="num">{journey.levels.length}</span> levels
                          </span>
                          <span className="flex items-center gap-1 text-xs font-bold text-[#b45309] dark:text-[#fbbf24]">
                            <Star className="size-3.5 fill-current" /> <span className="num">{stars}</span>
                          </span>
                        </div>
                      </div>
                      <Link
                        href={`/learn/${journey.id}`}
                        className={cn(
                          gameButtonClasses({ variant: 'secondary', size: 'sm' }),
                          'font-display font-bold',
                        )}
                      >
                        <span>
                          {passed.length === journey.levels.length
                            ? 'Review'
                            : passed.length
                              ? 'Continue'
                              : 'Start'}
                        </span>
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                  )
                })}
              </div>
            </GamePanel>
          </div>

          {/* Right Column: Trophy case and GitHub card */}
          <div className="flex flex-col gap-6">
            <GamePanel
              tone="default"
              title="Trophy case"
              icon={<Trophy className="size-5 text-[#f59e0b]" />}
              action={
                <span className="text-xs font-semibold text-(--cf-muted)">
                  <span className="num font-bold text-(--cf-text)">{earned.length}</span> of{' '}
                  <span className="num">{allAchievements.length}</span> unlocked
                </span>
              }
            >
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {allAchievements.map((item) => (
                  <AchievementMedal
                    key={item.id}
                    achievement={item}
                    size={64}
                    showDescription
                  />
                ))}
              </div>
            </GamePanel>

            <GithubCard
              signedIn={signedIn}
              projects={started.map((journey) => ({
                id: journey.id,
                title: journey.title,
                stack: tracks[journey.track].label,
                projectName: journey.projectName,
                passed: journey.levels.filter((level) => byProject[journey.id]?.[level.id]).length,
                total: journey.levels.length,
              }))}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
