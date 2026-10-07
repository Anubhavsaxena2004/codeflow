'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Compass,
  Flame,
  LockKeyhole,
  Mail,
  Shield,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import { achievementsFor, indexProgress, playerLevelFor, POSTS, postFor, streakDays, XP_PER_LEVEL } from '@/lib/journeys/progress'
import { tracks, trackIds, type Track } from '@/lib/journeys/types'
import type { ProjectSummary } from '@/lib/server/journeys'
import { useLearner } from '@/lib/use-learner'
import { ThemeToggle } from '@/components/theme-toggle'
import { SoundToggle } from '@/components/ui/sound'
import { GamePanel, LevelEmblem, Pill, SegmentedProgress, StatTile, gameButtonClasses } from '@/components/ui/game'
import { LoadingState, Skeleton } from '@/components/ui/states'
import { cn } from '@/lib/utils'
import { AchievementMedal } from './achievement-medal'
import { GithubCard } from './github-card'
import { Mascot } from './mascot'
import { StreakHeatmap } from './streak-heatmap'
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
  const { session, track, setTrack, trackLocked, levels, ready } = useLearner()
  const signedIn = session.status === 'signed-in'
  const [trackError, setTrackError] = useState<string | null>(null)

  const totalXp = levels.reduce((sum, row) => sum + row.xp, 0)
  const playerLevel = playerLevelFor(totalXp)
  const post = postFor(totalXp)
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
            <div className="flex items-center gap-2">
              <SoundToggle className="size-8 rounded-full border border-(--cf-border) bg-(--cf-surface)" />
              <ThemeToggle className="size-8 rounded-full border border-(--cf-border) bg-(--cf-surface) text-(--cf-muted)" />
            </div>
          </div>

          <LoadingState label="Loading player profile…">
            <div className="flex flex-col gap-6">
              <div className="relative overflow-hidden rounded-3xl border border-(--cf-border) bg-(--cf-surface) shadow-(--elev-2)">
                <div className="h-28 sm:h-36 w-full bg-(--cf-surface-2)" />
                <div className="px-5 pb-6 pt-0 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-16 mb-4">
                    <Skeleton shape="circle" className="size-20 sm:size-24 ring-4 ring-(--cf-surface)" />
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

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-(--cf-border) bg-(--cf-surface) p-4 space-y-2">
                    <Skeleton shape="line" className="h-3 w-16" />
                    <Skeleton shape="line" className="h-6 w-20" />
                  </div>
                ))}
              </div>

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

  const completionPercent = Math.round((earned.length / Math.max(1, allAchievements.length)) * 100)

  return (
    <main className="min-h-dvh bg-(--cf-bg) px-4 py-6 text-(--cf-text) md:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex w-fit items-center gap-2 rounded-xl border border-(--cf-border) bg-(--cf-surface) px-3 py-1.5 text-xs font-bold text-(--cf-muted) hover:text-(--cf-text) hover:bg-(--cf-surface-2) transition-all shadow-xs"
          >
            <ArrowLeft className="size-4" /> Back to the map
          </Link>

          <div className="flex items-center gap-2">
            <SoundToggle className="size-9 rounded-xl border border-(--cf-border) bg-(--cf-surface) text-(--cf-muted) hover:bg-(--cf-surface-2) hover:text-(--cf-text) shadow-xs" />
            <ThemeToggle className="size-9 rounded-xl border border-(--cf-border) bg-(--cf-surface) text-(--cf-muted) hover:bg-(--cf-surface-2) hover:text-(--cf-text) shadow-xs" />
          </div>
        </div>

        {/* Hero: AAA Player Card */}
        <GamePanel tone="raised" padding="none" className="relative overflow-hidden border border-(--cf-border) shadow-(--elev-2)">
          {/* Layered Game Scene Banner */}
          <div
            className="relative h-28 sm:h-36 w-full overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #2e1065 0%, #581c87 40%, #065f46 100%)',
            }}
          >
            {/* Starfield overlay */}
            <svg className="absolute inset-0 size-full opacity-35" aria-hidden="true">
              <circle cx="15%" cy="30%" r="1" fill="#fff" />
              <circle cx="28%" cy="65%" r="1.5" fill="#fff" />
              <circle cx="45%" cy="20%" r="1" fill="#fff" />
              <circle cx="62%" cy="75%" r="1.5" fill="#fff" />
              <circle cx="78%" cy="25%" r="1" fill="#fff" />
              <circle cx="92%" cy="60%" r="1.2" fill="#fff" />
            </svg>

            {/* Glowing atmosphere sweeps */}
            <div className="pointer-events-none absolute -left-12 -top-12 size-48 rounded-full bg-[#a855f7]/30 blur-2xl" />
            <div className="pointer-events-none absolute -right-10 -bottom-10 size-48 rounded-full bg-[#22c55e]/25 blur-2xl" />

            {/* Top Banner Chips */}
            <div className="relative flex items-center justify-between p-4 sm:p-5">
              <Pill tone="xp" size="sm" className="font-extrabold shadow-sm bg-black/40 text-white border-white/20">
                <BriefcaseBusiness className="size-3 text-[#fde047]" />
                {post.title} · Level {playerLevel.level}
              </Pill>

              {track && (
                <Pill tone="world" size="sm" className="font-extrabold shadow-sm bg-black/40 text-white border-white/20">
                  {tracks[track].label} Class
                </Pill>
              )}
            </div>
          </div>

          <div className="relative px-5 pb-6 pt-0 sm:px-6">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end">
              {/* Avatar frame with glowing ring and level emblem. Only the avatar overlaps the banner;
                  the name below it always sits on the card, so it stays readable. */}
              <div className="relative -mt-12 shrink-0 w-fit sm:-mt-16">
                <div
                  className="size-20 sm:size-24 rounded-full p-[3px] shadow-(--elev-3)"
                  style={{
                    background: 'linear-gradient(135deg, #c084fc, #7c3aed 50%, #22c55e 100%)',
                  }}
                >
                  <div className="size-full overflow-hidden rounded-full bg-(--cf-surface-2) grid place-items-center ring-2 ring-(--cf-surface)">
                    <Mascot className="size-full scale-105" />
                  </div>
                </div>

                <div className="absolute -bottom-1 -right-1 sm:bottom-0 sm:right-0 drop-shadow-md">
                  <LevelEmblem level={playerLevel.level} size={42} />
                </div>
              </div>

              {/* Player Identity */}
              <div className="min-w-0 flex-1 sm:pt-3">
                {signedIn ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="min-w-0 break-words font-display text-2xl sm:text-3xl font-black text-(--cf-text) tracking-tight">
                        {session.user.name}
                      </h1>
                      {session.user.isAdmin ? (
                        <Pill tone="xp" size="sm" className="font-bold">
                          <Shield className="size-3.5" /> Admin
                        </Pill>
                      ) : (
                        <Pill tone="neutral" size="sm" className="font-bold">
                          Learner
                        </Pill>
                      )}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-(--cf-muted)">
                      <Mail className="size-3.5 text-(--cf-faint)" />
                      {session.user.email}
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="font-display text-2xl sm:text-3xl font-black text-(--cf-text)">
                      Guest Developer
                    </h1>
                    <p className="mt-0.5 text-xs text-(--cf-muted)">
                      Progress is saved locally.{' '}
                      <Link
                        href="/register?next=/profile"
                        className="font-bold text-[#16a34a] hover:underline dark:text-[#4ade80]"
                      >
                        Create an account
                      </Link>{' '}
                      to link GitHub and sync progress.
                    </p>
                  </>
                )}
              </div>

              {/* Quick Jump Action */}
              <div className="shrink-0">
                <Link
                  href="/"
                  className={cn(gameButtonClasses({ variant: 'primary', size: 'md' }), 'w-full sm:w-auto font-display font-bold')}
                >
                  <Compass className="size-4 mr-1.5" /> Continue quest
                </Link>
              </div>
            </div>

            {/* Integrated progression: the XP level, then the career post */}
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-(--cf-border) bg-(--cf-surface-2)/80 p-4 shadow-xs">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-extrabold text-(--cf-text)">
                      Level <span className="num">{playerLevel.level}</span>
                    </span>
                    <span className="text-[11px] text-(--cf-muted)">
                      ({playerLevel.size - playerLevel.into} XP to level {playerLevel.level + 1})
                    </span>
                  </div>
                  <div className="font-display text-sm font-black text-[#7c3aed] dark:text-[#c4b5fd]">
                    <span className="num">{playerLevel.into}</span> / <span className="num">{playerLevel.size}</span> XP
                  </div>
                </div>
                <SegmentedProgress label="Level progress" value={playerLevel.into} max={playerLevel.size} segments={5} className="h-3" />
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-(--cf-muted)">
                  <span>Every {XP_PER_LEVEL} XP raises your level</span>
                  <span className="font-semibold text-(--cf-text)">
                    <span className="num font-bold">{levelsCompleted}</span> levels passed · <span className="num font-bold">{totalStars}</span> ★ earned
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-(--cf-border) bg-(--cf-surface-2)/80 p-4 shadow-xs">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 font-display font-extrabold text-(--cf-text)">
                    <BriefcaseBusiness className="size-3.5 text-[#15803d] dark:text-[#86efac]" /> Post: {post.title}
                  </span>
                  <span className="text-[11px] text-(--cf-muted)">
                    {post.next ? (
                      <>
                        <span className="num font-bold text-(--cf-text)">{post.toNext.toLocaleString()}</span> XP to {post.next.title}
                      </>
                    ) : (
                      'Top post reached'
                    )}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-(--cf-track)">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-[#22c55e] to-[#15803d] transition-[width] duration-500"
                    style={{ width: `${Math.round(post.progress * 100)}%` }}
                  />
                </div>
                <ol className="mt-2.5 flex flex-wrap gap-1" aria-label="Career posts">
                  {POSTS.map((item, index) => (
                    <li
                      key={item.title}
                      title={`${item.title}: ${item.xp.toLocaleString()} XP`}
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        index === post.index
                          ? 'bg-[#15803d] text-white'
                          : index < post.index
                            ? 'bg-[#22c55e]/15 text-[#15803d] dark:text-[#86efac]'
                            : 'bg-(--cf-surface) text-(--cf-muted)',
                      )}
                    >
                      {item.title}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </GamePanel>

        {/* 5 Stats Cards Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile
            icon={<Sparkles className="size-5" />}
            label="Total XP"
            value={<CountUpNumber value={totalXp} />}
            sublabel="Lifetime earned"
            tone="xp"
            className="hover:-translate-y-1 hover:shadow-md transition-all shadow-xs"
          />
          <StatTile
            icon={<BriefcaseBusiness className="size-5" />}
            label="Current post"
            value={post.title}
            sublabel={`Level ${playerLevel.level} · post ${post.index + 1} of ${POSTS.length}`}
            tone="default"
            className="hover:-translate-y-1 hover:shadow-md transition-all shadow-xs"
          />
          <StatTile
            icon={<Star className="size-5 fill-current" />}
            label="Stars earned"
            value={<CountUpNumber value={totalStars} />}
            sublabel={`${totalStars} ★ collected`}
            tone="star"
            className="hover:-translate-y-1 hover:shadow-md transition-all shadow-xs"
          />
          <StatTile
            icon={<Flame className="size-5 fill-current" />}
            label="Day streak"
            value={<CountUpNumber value={streak} />}
            sublabel={streak > 0 ? `${streak} day streak` : 'Play today!'}
            tone="streak"
            className="hover:-translate-y-1 hover:shadow-md transition-all shadow-xs"
          />
          <StatTile
            icon={<CheckCircle2 className="size-5" />}
            label="Levels passed"
            value={<CountUpNumber value={levelsCompleted} />}
            sublabel={`${levelsCompleted} completed`}
            tone="success"
            className="hover:-translate-y-1 hover:shadow-md transition-all shadow-xs"
          />
        </div>

        {/* Streak heatmap, GitHub / LeetCode style */}
        <GamePanel
          tone="default"
          title="Activity"
          icon={<CalendarDays className="size-5 text-[#16a34a] dark:text-[#4ade80]" />}
          action={
            <span className="flex items-center gap-1 text-xs font-semibold text-(--cf-muted)">
              <Flame className="size-3.5 fill-[#f97316] text-[#f97316]" /> <span className="num font-bold text-(--cf-text)">{streak}</span> day streak
            </span>
          }
        >
          <StreakHeatmap rows={levels} />
        </GamePanel>

        {/* Two-column layout: Left (Class & Journeys), Right (Trophy Case & GitHub) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
          {/* Left Column: Tech Stack & Journeys */}
          <div className="flex flex-col gap-6">
            {/* Tech Stack Class Picker */}
            <GamePanel
              tone="default"
              title="Tech stack class"
              icon={<Compass className="size-5 text-[#22c55e]" />}
              action={
                track && (
                  <Pill tone="success" size="sm" className="font-bold">
                    {tracks[track].label}
                  </Pill>
                )
              }
            >
              <p className="mb-4 text-xs leading-relaxed text-(--cf-muted)">
                {trackLocked ? (
                  <span className="flex items-start gap-1.5">
                    <LockKeyhole className="mt-0.5 size-3.5 shrink-0" />
                    Your stack is chosen for good. The island world map and logic challenges follow it. Only an admin can move you to another stack.
                  </span>
                ) : track ? (
                  'As an admin you can switch stacks any time; progress in each stack is kept.'
                ) : (
                  'Pick your primary stack. You choose it once, so pick carefully: only an admin can change it later.'
                )}
              </p>
              {ready ? (
                <TrackPicker
                  value={track}
                  onPick={(next) => {
                    if (!track && !window.confirm(`Start with ${tracks[next].label}? You can only choose your stack once; after that only an admin can change it.`)) return
                    setTrackError(null)
                    void setTrack(next).then(setTrackError)
                  }}
                  journeyCounts={journeyCounts}
                  layout="list"
                  locked={trackLocked}
                />
              ) : (
                <p className="text-sm text-(--cf-muted)">Loading tech stacks…</p>
              )}
              {trackError && <p role="alert" className="mt-3 text-xs font-semibold text-[#b91c1c] dark:text-[#f87171]">{trackError}</p>}
            </GamePanel>

            {/* Journeys Explorer */}
            <GamePanel
              tone="default"
              title="Journeys"
              action={
                <span className="text-xs font-semibold text-(--cf-muted)">
                  <span className="num font-bold text-(--cf-text)">{started.length}</span> active
                </span>
              }
            >
              <div className="flex flex-col gap-3">
                {started.length === 0 && (
                  <p className="text-xs text-(--cf-muted)">
                    Pick a tech stack above to see its learning journeys.
                  </p>
                )}
                {started.map((journey) => {
                  const done = byProject[journey.id] ?? {}
                  const passed = journey.levels.filter((level) => done[level.id])
                  const stars = passed.reduce((sum, level) => sum + (done[level.id]?.stars ?? 0), 0)
                  const percent = Math.round((passed.length / Math.max(1, journey.levels.length)) * 100)
                  const isFinished = passed.length === journey.levels.length

                  return (
                    <div
                      key={journey.id}
                      className="group flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-(--cf-border) bg-(--cf-surface-2)/60 p-4 transition-all hover:bg-(--cf-surface-2) hover:shadow-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-sm font-bold text-(--cf-text)">
                            {journey.title}
                          </span>
                          <span className="text-xs font-semibold text-(--cf-muted)">
                            · {tracks[journey.track].label}
                          </span>
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-3">
                          <span className="h-2 w-32 sm:w-40 overflow-hidden rounded-full bg-(--cf-track)">
                            <span
                              className="block h-full rounded-full bg-linear-to-r from-[#22c55e] to-[#15803d] transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </span>
                          <span className="text-xs font-bold text-(--cf-muted)">
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
                          gameButtonClasses({
                            variant: isFinished ? 'secondary' : 'primary',
                            size: 'sm',
                          }),
                          'font-display font-bold shrink-0',
                        )}
                      >
                        <span>
                          {isFinished ? 'Review' : passed.length ? 'Continue' : 'Start'}
                        </span>
                        <ArrowRight className="size-3.5 ml-1.5" />
                      </Link>
                    </div>
                  )
                })}
              </div>
            </GamePanel>
          </div>

          {/* Right Column: Trophy Case & GitHub */}
          <div className="flex flex-col gap-6">
            {/* Trophy Case: Framed Collectible Cards */}
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
              {/* Overall Unlock Progress */}
              <div className="mb-4 rounded-xl border border-(--cf-border) bg-(--cf-surface-2) p-3 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-(--cf-muted) mb-1.5">
                  <span className="font-display font-bold text-(--cf-text)">Trophy completion</span>
                  <span className="num font-bold text-[#b45309] dark:text-[#fde047]">
                    {completionPercent}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-(--cf-track) overflow-hidden">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-[#f5b301] to-[#d97706] transition-all duration-500"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>

              {/* 3x2 Grid of Collectible Trophy Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {allAchievements.map((item) => {
                  const isEarned = item.current >= item.target

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'group relative flex flex-col items-center justify-between rounded-2xl border p-3.5 text-center transition-all duration-200',
                        isEarned
                          ? 'border-[#f5b301]/40 bg-gradient-to-b from-[#fef9c3]/25 to-(--cf-surface) shadow-xs dark:from-[#78350f]/15 hover:shadow-sm'
                          : 'border-(--cf-border) bg-(--cf-surface-2)/50 hover:bg-(--cf-surface-2) hover:border-(--cf-border-strong,var(--cf-border))',
                      )}
                    >
                      <AchievementMedal
                        achievement={item}
                        size={64}
                        hideTitle
                        className="w-auto min-w-0"
                      />

                      <div className="mt-2.5 w-full min-w-0 flex-1">
                        <span
                          className="block font-display text-xs font-bold text-(--cf-text) truncate"
                          title={item.title}
                        >
                          {item.title}
                        </span>
                        <span className="mt-1 block text-[11px] leading-snug text-(--cf-muted) line-clamp-2">
                          {item.description}
                        </span>
                      </div>

                      <div className="mt-2.5 w-full">
                        {isEarned ? (
                          <Pill
                            tone="star"
                            size="sm"
                            className="w-full justify-center text-[10px] font-bold py-0.5"
                          >
                            ★ Unlocked
                          </Pill>
                        ) : item.target > 1 ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="h-1.5 w-full max-w-[80px] rounded-full bg-(--cf-track) overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#f5b301]"
                                style={{
                                  width: `${Math.min(100, (item.current / item.target) * 100)}%`,
                                }}
                              />
                            </div>
                            <span className="num text-[10px] font-semibold text-(--cf-muted)">
                              {item.current}/{item.target}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-semibold text-(--cf-muted)">
                            Locked
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </GamePanel>

            {/* Linked Account (GitHub) */}
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
