'use client'

import { useEffect, useId, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Bug, Check, ChevronDown, Circle, Crosshair, Flame, House, LockKeyhole, LogOut, Menu, Network, PencilRuler, Puzzle, Shield, Skull, SquareTerminal, Star, Trophy, UserRound, X } from 'lucide-react'
import { kindIcons, Stars, worldThemes } from '@/components/journey/level-meta'
import { Tilt } from '@/components/effects/tilt'
import { ThemeToggle } from '@/components/theme-toggle'
import { SoundToggle } from '@/components/ui/sound'
import { achievementsFor, indexProgress, rankFor, streakDays, type Achievement } from '@/lib/journeys/progress'
import { kindLabels, tracks, trackIds, type Track } from '@/lib/journeys/types'
import type { ProjectSummary } from '@/lib/server/journeys'
import { starsFor } from '@/lib/scoring'
import { useLearner } from '@/lib/use-learner'
import { cn } from '@/lib/utils'
import { Mascot } from './mascot'
import { TrackPicker } from './track-picker'
import { JourneyMap } from './journey-map'
import { QuestCard } from './quest-card'
import { AchievementMedal } from './achievement-medal'
import type { LevelState } from './world-map'
import { GamePanel, GameButton, gameButtonClasses, Pill, SegmentedProgress, RankEmblem, StatTile, GameTooltip } from '@/components/ui/game'
import { LoadingState, Skeleton, SkeletonText } from '@/components/ui/states'

type IconType = ComponentType<{ className?: string }>

const challengeCards = [
  { id: 'signup', title: 'Signup Flow', description: 'Arrange validation, hashing, persistence and a safe response.', difficulty: 'Intermediate', active: true },
  { id: 'login', title: 'Login Flow', description: 'Coming soon: verify credentials without leaking information.', difficulty: 'Intermediate', active: false },
  { id: 'jwt', title: 'JWT Auth Middleware', description: 'Coming soon: protect routes and handle expired tokens.', difficulty: 'Advanced', active: false },
]

const achievementStyles: Record<Achievement['icon'], { icon: IconType; color: string }> = {
  trophy: { icon: Trophy, color: '#f59e0b' },
  bug: { icon: Bug, color: '#ef4444' },
  terminal: { icon: SquareTerminal, color: '#2563eb' },
  star: { icon: Star, color: '#eab308' },
  network: { icon: Network, color: '#7c3aed' },
  skull: { icon: Skull, color: '#dc2626' },
}

const GREEN = 'linear-gradient(135deg, #22c55e, #15803d)'
const primaryButton = 'btn-shine inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-[0_4px_12px_rgb(22_163_74/0.35)] transition hover:brightness-110'

function NavLink({
  href,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  href: string
  icon: IconType
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <GameTooltip content={label} side="right">
      <Link
        href={href}
        onClick={onClick}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group relative flex h-11 items-center gap-3 rounded-[var(--radius-md,14px)] px-3 text-sm font-semibold transition-colors duration-[var(--dur-fast,160ms)]',
          'hover:bg-(--cf-surface-2) hover:text-(--cf-text)',
          active
            ? 'bg-[#22c55e]/12 text-[#15803d] dark:text-[#86efac] before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-[3px] before:rounded-r before:bg-[#22c55e]'
            : 'text-(--cf-muted)',
          'w-full md:max-lg:justify-center md:max-lg:px-0 lg:w-full',
        )}
      >
        <Icon
          className={cn(
            'size-5 shrink-0 transition-colors',
            active ? 'text-[#15803d] dark:text-[#86efac]' : 'text-(--cf-muted) group-hover:text-(--cf-text)',
          )}
        />
        <span className="truncate md:max-lg:sr-only lg:inline-block">
          {label}
        </span>
      </Link>
    </GameTooltip>
  )
}

function Card({ title, icon, children, className, aside }: { title?: string; icon?: ReactNode; children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <section className={cn('rounded-2xl border border-(--cf-border) bg-(--cf-surface) p-4 shadow-(--cf-shadow)', className)}>
      {title && (
        <div className="mb-3 flex items-center gap-2">
          {icon}
          <h2 className="text-[15px] font-bold text-(--cf-text) font-display">{title}</h2>
          {aside && <span className="ml-auto">{aside}</span>}
        </div>
      )}
      {children}
    </section>
  )
}

function ProgressRing({ value, passedCount, totalCount }: { value: number; passedCount?: number; totalCount?: number }) {
  const uid = useId().replace(/:/g, '')
  const radius = 51
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference
  const ariaLabel = `Progress: ${passedCount ?? value} of ${totalCount ?? 100} levels completed, ${value} percent`

  return (
    <div role="img" aria-label={ariaLabel} className="relative size-[88px] shrink-0 sm:size-[112px]">
      <svg viewBox="0 0 112 112" className="size-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}-ring`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
        </defs>
        <circle cx="56" cy="56" r={radius} fill="none" stroke="var(--cf-surface-2)" strokeWidth="10" />
        {value > 0 && (
          <circle
            cx="56"
            cy="56"
            r={radius}
            fill="none"
            stroke={`url(#${uid}-ring)`}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-[var(--dur-count,800ms)] ease-[var(--ease-out)] motion-reduce:transition-none"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-lg font-extrabold leading-none text-(--cf-text) sm:text-2xl">
          <span className="num">{value}</span>%
        </span>
        {passedCount != null && totalCount != null && (
          <span className="mt-1 text-[9px] font-bold text-(--cf-muted) sm:text-[10px]">
            <span className="num">{passedCount}</span>/<span className="num">{totalCount}</span> levels
          </span>
        )}
      </div>
    </div>
  )
}

function Bar({ value, color = GREEN, className }: { value: number; color?: string; className?: string }) {
  return (
    <span className={cn('block h-2 overflow-hidden rounded-full bg-(--cf-track)', className)}>
      <span className="block h-full rounded-full transition-[width]" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </span>
  )
}

export function JourneyHome({ journeys, initialJourney }: { journeys: ProjectSummary[]; initialJourney: string | null }) {
  const { session, track, setTrack, levels, challenges, ready } = useLearner()
  const [picking, setPicking] = useState(false)
  const [journeyId, setJourneyId] = useState<string | null>(initialJourney)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focus, setFocus] = useState<{ worldId: string; nonce: number } | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [xpDelta, setXpDelta] = useState<number | null>(null)
  const prevXpRef = useRef(0)

  const trackJourneys = journeys.filter((journey) => journey.track === track)
  const journey = trackJourneys.find((item) => item.id === journeyId) ?? trackJourneys[0] ?? null
  const done = useMemo(() => (journey ? indexProgress(levels)[journey.id] ?? {} : {}), [journey, levels])
  const allOpen = !!session.user?.allLevelsOpen
  const currentIndex = journey ? journey.levels.findIndex((level) => !done[level.id]) : -1
  const stateOf = (index: number): LevelState => (done[journey!.levels[index].id] ? 'done' : index === currentIndex ? 'current' : allOpen ? 'open' : 'locked')
  const selectedIndex = journey ? Math.max(0, journey.levels.findIndex((level) => level.id === (selectedId ?? journey.levels[currentIndex >= 0 ? currentIndex : journey.levels.length - 1].id))) : -1
  const selected = journey?.levels[selectedIndex]

  const totalXp = levels.reduce((sum, row) => sum + row.xp, 0)
  const rank = rankFor(totalXp)
  const streak = streakDays(levels)
  const achievements = achievementsFor(journeys, levels)
  const earned = achievements.filter((item) => item.current >= item.target)
  const passedCount = journey ? journey.levels.filter((level) => done[level.id]).length : 0
  const percent = journey ? Math.round((passedCount / journey.levels.length) * 100) : 0
  const journeyCounts = Object.fromEntries(trackIds.map((id) => [id, journeys.filter((item) => item.track === id).length])) as Record<Track, number>
  const initials = session.user?.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() ?? 'ME'
  const challengeStack = track ? tracks[track].challengeStack : 'express'

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        document.documentElement.classList.add('tab-hidden')
      } else {
        document.documentElement.classList.remove('tab-hidden')
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setScrolled(!entry.isIntersecting)
      },
      { threshold: 0, rootMargin: '-8px 0px 0px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (ready && prevXpRef.current > 0 && totalXp > prevXpRef.current) {
      const diff = totalXp - prevXpRef.current
      setXpDelta(diff)
      const timer = setTimeout(() => setXpDelta(null), 900)
      prevXpRef.current = totalXp
      return () => clearTimeout(timer)
    }
    prevXpRef.current = totalXp
  }, [totalXp, ready])

  const pickTrack = (next: Track) => {
    void setTrack(next)
    setPicking(false)
    setJourneyId(null)
    setSelectedId(null)
  }

  /** Jumps to a world: its next level is selected, the 3D camera flies there (the 2D map scrolls to it). */
  const goToWorld = (worldId: string) => {
    if (!journey) return
    const inWorld = journey.levels.filter((level) => level.world === worldId)
    setSelectedId((inWorld.find((level) => !done[level.id]) ?? inWorld[0])?.id ?? null)
    setFocus({ worldId, nonce: Date.now() })
    document.getElementById(`island-${worldId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const activeChipRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (activeChipRef.current) {
      activeChipRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [selected?.world])

  const nav = (
    <>
      <NavLink href="/" icon={House} label="Home" active onClick={() => setMobileOpen(false)} />
      <NavLink href="/profile" icon={UserRound} label="Profile" onClick={() => setMobileOpen(false)} />
      {session.user?.isAdmin && <NavLink href="/admin" icon={Shield} label="Admin" onClick={() => setMobileOpen(false)} />}
      <NavLink href="/mentor" icon={PencilRuler} label="Mentor mode" onClick={() => setMobileOpen(false)} />
    </>
  )

  // The selected level, with the rest of its world as steps to pick from.
  const renderDetails = () => {
    if (!journey || !selected) return null
    const state = stateOf(selectedIndex)
    const worldIndex = journey.worlds.findIndex((world) => world.id === selected.world)
    const world = journey.worlds[worldIndex]
    const palette = worldThemes[world.theme]
    const inWorld = journey.levels.map((level, index) => ({ level, index })).filter(({ level }) => level.world === selected.world)
    const worldDone = inWorld.filter(({ level }) => done[level.id]).length
    const row = done[selected.id]

    return (
      <QuestCard
        journey={journey}
        selected={selected}
        selectedIndex={selectedIndex}
        state={state}
        row={row}
        palette={palette}
        worldIndex={worldIndex}
        worldTitle={world.title}
        inWorldLevels={inWorld}
        worldDoneCount={worldDone}
        done={done}
        stateOf={stateOf}
        onSelectLevel={setSelectedId}
      />
    )
  }

  const next = journey && currentIndex >= 0 ? journey.levels[currentIndex] : null
  const nextWorld = next && journey ? journey.worlds.find((world) => world.id === next.world) : null

  const mascotCard = (
    <GamePanel tone="raised" padding="sm" className="relative mt-auto border border-(--cf-border)">
      <div className="relative rounded-xl border border-(--cf-border) bg-(--cf-surface-2) p-3 shadow-xs">
        <p className="text-[12px] font-bold leading-snug text-(--cf-text)">
          {next ? `Next up: ${next.title}` : 'Ready for your next quest?'}
        </p>
        <div className="absolute -bottom-1.5 left-6 size-3 rotate-45 border-b border-r border-(--cf-border) bg-(--cf-surface-2)" aria-hidden="true" />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Mascot className="size-[72px] shrink-0 animate-mascot-bob" />
        <div className="min-w-0 flex-1">
          <p className="pb-1 text-[13px] font-bold leading-5 text-(--cf-text)">Small steps build big developers.</p>
          <p className="text-[11px] leading-4 text-(--cf-muted)">
            Every level adds real files to a real project you can push to GitHub.
          </p>
        </div>
      </div>
      {journey && (
        <div className="mt-3">
          <Bar value={percent} />
          <div className="mt-1 text-[11px] font-semibold text-(--cf-muted)">
            {percent}% of {journey.title}
          </div>
        </div>
      )}
    </GamePanel>
  )

  return (
    <div className="min-h-dvh bg-(--cf-bg) text-(--cf-text) md:flex">
      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true" aria-label="Navigation drawer">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 flex h-full w-72 flex-col border-r border-(--cf-border) bg-(--cf-surface) p-4 shadow-(--elev-4)"
            >
              <div className="flex items-center justify-between pb-4 border-b border-(--cf-border)">
                <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-xl text-sm font-extrabold text-white shadow-md" style={{ background: GREEN }}>{'</>'}</span>
                  <span>
                    <span className="block text-lg font-extrabold leading-tight font-display">CodeFlow</span>
                    <span className="block text-[11px] font-medium text-(--cf-faint)">Learn · Build · Level up</span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="rounded-lg p-1.5 text-(--cf-muted) hover:bg-(--cf-surface-2) hover:text-(--cf-text)"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="mt-4 mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-(--cf-muted)">
                Menu
              </div>
              <nav aria-label="Mobile Navigation" className="flex flex-col gap-1">
                {nav}
              </nav>
              <div className="mt-auto pt-4">
                {mascotCard}
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar: Rail on tablet (md), Full width on desktop (lg) */}
      <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-(--cf-border) bg-(--cf-surface) p-3 transition-all md:flex md:w-[var(--sidebar-w-rail,72px)] lg:w-[var(--sidebar-w,248px)]">
        <Link href="/" className="flex items-center gap-2.5 px-1 py-1">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold text-white shadow-md" style={{ background: GREEN }}>{'</>'}</span>
          <span className="hidden min-w-0 lg:block">
            <span className="block text-xl font-extrabold leading-5 font-display">CodeFlow</span>
            <span className="block text-[11px] font-medium text-(--cf-faint)">Learn · Build · Level up</span>
          </span>
        </Link>
        <div className="mt-6 mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-(--cf-muted) md:max-lg:sr-only lg:block">
          Menu
        </div>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {nav}
        </nav>
        <div className="mt-auto hidden lg:block">
          {mascotCard}
        </div>
      </aside>

      <div className="relative min-w-0 flex-1">
        {/* Scroll Sentinel for header elevation */}
        <div ref={sentinelRef} className="pointer-events-none absolute top-0 left-0 h-2 w-full" aria-hidden="true" />

        {/* Header HUD */}
        <header
          className={cn(
            'sticky top-0 z-30 flex h-14 sm:h-16 items-center gap-3 border-b border-(--cf-border) bg-(--cf-surface)/85 px-4 backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-(--cf-surface) transition-shadow duration-[var(--dur-base,240ms)] md:px-6 xl:px-6',
            scrolled ? 'shadow-(--elev-2)' : 'shadow-none',
          )}
        >
          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-(--cf-border) bg-(--cf-surface) text-(--cf-muted) hover:bg-(--cf-surface-2) hover:text-(--cf-text) md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="size-5" />
          </button>

          {/* Logo on mobile only */}
          <Link href="/" className="flex items-center gap-1.5 md:hidden">
            <span className="grid size-7 place-items-center rounded-lg text-xs font-extrabold text-white" style={{ background: GREEN }}>{'</>'}</span>
            <span className="font-extrabold font-display text-sm">CodeFlow</span>
          </Link>

          {/* Desktop Journey heading */}
          <div className="hidden lg:block">
            <h1 className="text-xl font-extrabold font-display">Your coding journey</h1>
            <p className="text-xs text-(--cf-muted)">Build real projects level by level, fix planted bugs, and push what you build to GitHub.</p>
          </div>

          {/* Stack chip */}
          {track && (
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="group inline-flex items-center gap-1.5 rounded-full border border-(--cf-border) bg-(--cf-surface) px-3 py-1.5 text-xs font-bold text-(--cf-text) shadow-xs transition-all duration-[var(--dur-fast,160ms)] hover:-translate-y-[1px] hover:bg-(--cf-surface-2) active:translate-y-0"
              title="Change your tech stack"
            >
              <span className="size-2 rounded-full bg-[#22c55e]" aria-hidden="true" />
              <span>{tracks[track].label} stack</span>
              <ChevronDown className="size-3 text-(--cf-muted) transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
            </button>
          )}

          {/* Flexible space */}
          <div className="flex-1 min-w-2" />

          {/* Streak */}
          {!ready ? (
            <Skeleton shape="block" className="h-8 w-24 rounded-full" />
          ) : (
            <GameTooltip
              content={streak > 0 ? 'Keep your streak alive — finish a level today' : 'Start a streak: finish any level'}
              side="bottom"
            >
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold select-none transition-colors',
                  streak > 0
                    ? 'border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] dark:border-[#f97316]/30 dark:bg-[#f97316]/15 dark:text-[#fdba74]'
                    : 'border-(--cf-border) bg-(--cf-surface) text-(--cf-muted)',
                )}
              >
                <Flame
                  aria-hidden="true"
                  className={cn(
                    'size-4 shrink-0 transition-transform',
                    streak > 0
                      ? 'fill-[#f97316] text-[#f97316] animate-flame'
                      : 'fill-none text-slate-400 dark:text-zinc-500',
                  )}
                />
                <span className="sr-only">{streak}-day streak</span>
                <span aria-hidden="true">
                  <span className="num font-bold text-(--cf-text)">{streak}</span>{' '}
                  <span className="hidden sm:inline">day streak</span>
                  <span className="sm:hidden">d</span>
                </span>
              </span>
            </GameTooltip>
          )}

          {/* Rank and XP */}
          {!ready ? (
            <div className="flex items-center gap-2">
              <Skeleton shape="circle" className="size-8 sm:size-10" />
              <div className="hidden sm:flex flex-col gap-1.5">
                <Skeleton shape="line" className="h-3 w-28" />
                <Skeleton shape="line" className="h-2 w-36" />
              </div>
            </div>
          ) : (
            <div className="relative flex items-center gap-2">
              <RankEmblem rank={rank.rank} size={40} className="hidden sm:inline-flex" />
              <RankEmblem rank={rank.rank} size={32} className="sm:hidden" />
              <div className="hidden sm:flex flex-col gap-0.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-(--cf-muted)">
                  <span className="font-display font-bold text-(--cf-text)">Rank <span className="num">{rank.rank}</span></span>
                  <span className="num">{rank.into} / {rank.size} XP</span>
                </div>
                <SegmentedProgress
                  value={rank.into}
                  max={rank.size}
                  segments={5}
                  tone="xp"
                  label={`Rank ${rank.rank} progress`}
                  className="w-36 lg:w-[180px]"
                />
              </div>
              {/* Floating +n XP badge on XP increase */}
              <AnimatePresence>
                {xpDelta !== null && (
                  <motion.span
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: 1, y: -16 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    className="pointer-events-none absolute -top-3 right-0 rounded-full bg-[#a855f7] px-2 py-0.5 text-[11px] font-extrabold text-white shadow-md"
                  >
                    +{xpDelta} XP
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Sound toggle & Theme toggle */}
          <SoundToggle />
          <ThemeToggle />

          {/* Avatar / Auth */}
          {session.status === 'signed-in' ? (
            <span className="flex items-center gap-1.5">
              <Link
                href="/profile"
                title={`${session.user.name} · ${session.user.email}`}
                className="group relative inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#a855f7] to-[#6d28d9] p-[2px] shadow-xs transition-transform hover:scale-105"
              >
                <span className="grid size-full place-items-center overflow-hidden rounded-full bg-[#dcfce7] ring-2 ring-(--cf-surface)">
                  <Mascot className="size-full" />
                  <span className="sr-only">{initials}</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={session.signOut}
                aria-label="Sign out"
                title="Sign out"
                className="rounded-full p-2 text-(--cf-muted) transition-colors hover:bg-(--cf-surface-2) hover:text-(--cf-text)"
              >
                <LogOut className="size-4" />
              </button>
            </span>
          ) : session.status === 'guest' ? (
            <Link href="/login" className={primaryButton} style={{ background: GREEN }}>
              Sign in
            </Link>
          ) : null}

          {/* Mobile thin XP strip along bottom edge */}
          <div className="absolute inset-x-0 bottom-0 h-1 sm:hidden bg-(--cf-track) overflow-hidden" aria-hidden="true">
            <div
              className="h-full bg-gradient-to-r from-[#a855f7] to-[#6d28d9] transition-all duration-[var(--dur-count,900ms)] ease-[var(--ease-out)]"
              style={{ width: `${(rank.into / rank.size) * 100}%` }}
            />
          </div>
        </header>

        {/* Mobile secondary quick-nav */}
        <nav aria-label="Main" className="flex w-full gap-1 overflow-x-auto border-b border-(--cf-border) bg-(--cf-surface) p-2 md:hidden">
          {nav}
        </nav>

        <main className="p-4 md:p-6">
          {session.status === 'guest' && ready && track && (
            <p className="mb-4 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-2.5 text-xs text-[#1e40af] dark:border-[#2563eb]/40 dark:bg-[#2563eb]/15 dark:text-[#bfdbfe]">
              Playing as a guest: your progress stays in this browser. <Link href="/register" className="font-semibold underline">Create an account</Link> to keep it everywhere and push your project to GitHub.
            </p>
          )}

          {!ready ? (
            <LoadingState label="Loading your journey…">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="flex min-w-0 flex-col gap-5">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="space-y-2">
                      <Skeleton shape="line" className="h-6 w-48" />
                      <Skeleton shape="line" className="h-4 w-72" />
                    </div>
                    <Skeleton shape="block" className="h-10 w-32 rounded-xl" />
                  </div>
                  <div className="flex gap-2 overflow-hidden py-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} shape="block" className="h-12 w-36 shrink-0 rounded-2xl" />
                    ))}
                  </div>
                  <div className="relative aspect-[16/10] w-full min-h-[380px] rounded-3xl border border-(--cf-border) bg-(--cf-surface) overflow-hidden flex flex-col items-center justify-center p-8">
                    <div className="relative size-40 sm:size-48 rounded-full bg-(--cf-surface-2) border border-(--cf-border) flex items-center justify-center shadow-inner">
                      <Skeleton shape="circle" className="size-24 bg-(--cf-surface)" />
                    </div>
                    <div className="mt-4 flex flex-col items-center gap-2">
                      <Skeleton shape="line" className="h-4 w-32" />
                      <Skeleton shape="line" className="h-3 w-48" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl border border-(--cf-border) bg-(--cf-surface) p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <Skeleton shape="circle" className="size-12" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton shape="line" className="h-4 w-3/4" />
                        <Skeleton shape="line" className="h-3 w-1/2" />
                      </div>
                    </div>
                    <SkeletonText lines={3} />
                    <Skeleton shape="block" className="h-10 w-full rounded-xl" />
                  </div>
                  <div className="rounded-2xl border border-(--cf-border) bg-(--cf-surface) p-5 space-y-3">
                    <Skeleton shape="line" className="h-4 w-28" />
                    <div className="grid grid-cols-6 gap-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} shape="circle" className="size-9" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </LoadingState>
          ) : !track || picking ? (
            <Card className="mx-auto max-w-3xl p-6">
              <h2 className="text-lg font-extrabold">{track ? 'Change your tech stack' : 'Pick your tech stack'}</h2>
              <p className="mb-5 mt-1 text-sm text-(--cf-muted)">Your journey, challenges and code all follow the stack you choose. You can switch any time; progress in each stack is kept.</p>
              <TrackPicker value={track} onPick={pickTrack} journeyCounts={journeyCounts} />
              {track && (
                <button type="button" onClick={() => setPicking(false)} className="mt-4 text-sm text-(--cf-muted) underline-offset-4 hover:underline">Cancel</button>
              )}
            </Card>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex min-w-0 flex-col gap-5">
                {trackJourneys.length > 1 && (
                  <div className="flex flex-wrap gap-2" role="tablist" aria-label="Projects">
                    {trackJourneys.map((item, number) => (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={item.id === journey?.id}
                        onClick={() => {
                          setJourneyId(item.id)
                          setSelectedId(null)
                        }}
                        className={cn('rounded-full px-4 py-1.5 text-sm font-bold', item.id === journey?.id ? 'bg-(--cf-text) text-(--cf-surface)' : 'bg-(--cf-surface) text-(--cf-muted) shadow-sm')}
                      >
                        {number + 1}. {item.title}
                      </button>
                    ))}
                  </div>
                )}

                {journey ? (
                  <>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-extrabold font-display">{journey.title}</h2>
                        <p className="text-sm text-(--cf-muted)">{journey.summary}</p>
                      </div>
                      <Link href={`/learn/${journey.id}`} className={primaryButton} style={{ background: GREEN }}>
                        {passedCount === 0 ? 'Start the journey' : currentIndex < 0 ? 'Review the journey' : 'Continue'} <ArrowRight className="size-4" />
                      </Link>
                    </div>

                    <div className="relative -mx-2 px-2">
                      <div
                        className="no-scrollbar flex gap-2 overflow-x-auto pb-1 pt-0.5 scroll-smooth [scroll-snap-type:x_mandatory] [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]"
                        aria-label="Worlds"
                      >
                        {journey.worlds.map((world, worldIndex) => {
                          const palette = worldThemes[world.theme]
                          const WorldIcon = palette.icon
                          const inWorld = journey.levels.map((level, index) => ({ level, index })).filter(({ level }) => level.world === world.id)
                          const doneCount = inWorld.filter(({ level }) => done[level.id]).length
                          const totalCount = inWorld.length
                          const complete = totalCount > 0 && doneCount === totalCount
                          const reached = inWorld.some(({ index }) => stateOf(index) !== 'locked')
                          const isActive = world.id === (selected?.world ?? journey.worlds[0]?.id)
                          return (
                            <button
                              key={world.id}
                              ref={isActive ? activeChipRef : undefined}
                              type="button"
                              onClick={() => goToWorld(world.id)}
                              aria-current={isActive ? 'true' : undefined}
                              aria-pressed={isActive}
                              className={cn(
                                'flex shrink-0 [scroll-snap-align:start] items-center gap-2.5 rounded-2xl px-3 py-2 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)',
                                isActive
                                  ? 'text-white shadow-(--elev-2)'
                                  : 'border border-(--cf-border) bg-(--cf-panel) text-(--cf-text) shadow-sm hover:border-(--cf-border-hover) hover:bg-(--cf-surface-2)',
                                !reached && 'opacity-65 saturate-60',
                              )}
                              style={isActive ? { backgroundColor: palette.deep } : undefined}
                            >
                              <span
                                className="grid size-7 shrink-0 place-items-center rounded-xl"
                                style={{
                                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : `${palette.color}25`,
                                  color: isActive ? '#ffffff' : palette.deep,
                                }}
                              >
                                <WorldIcon className="size-3.5" />
                              </span>
                              <span className="leading-tight">
                                <span className={cn('block text-[10px] font-display font-extrabold uppercase tracking-wider', isActive ? 'text-white/80' : 'text-(--cf-muted)')}>
                                  World {worldIndex + 1}
                                </span>
                                <span className="block font-display text-[13px] font-extrabold leading-tight">
                                  {world.title}
                                </span>
                              </span>
                              <div className="ml-1 flex items-center gap-1.5 pl-1">
                                {!reached ? (
                                  <LockKeyhole aria-label="Locked" className="size-3.5 shrink-0 opacity-80" />
                                ) : complete ? (
                                  <span className="flex items-center gap-1 rounded-full bg-black/15 px-1.5 py-0.5 text-[10px] font-bold">
                                    <Check aria-label="World complete" className="size-3.5 text-[#22c55e]" />
                                    <span>{doneCount}/{totalCount}</span>
                                  </span>
                                ) : (
                                  <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold font-display', isActive ? 'bg-black/20 text-white/95' : 'bg-(--cf-surface-2) text-(--cf-muted)')}>
                                    {doneCount}/{totalCount}
                                  </span>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <JourneyMap journey={journey} done={done} stateOf={stateOf} selectedId={selected?.id ?? null} onSelect={setSelectedId} onSelectWorld={goToWorld} focus={focus} />

                    {renderDetails()}
                  </>
                ) : (
                  <Card className="p-6">
                    <h2 className="font-bold">The {tracks[track].label} journey is being built</h2>
                    <p className="mt-1 text-sm text-(--cf-muted)">
                      Meanwhile, the Signup Flow challenge below has a {tracks[track].label} version, or switch stacks to start a journey that is ready.
                    </p>
                  </Card>
                )}

                <Card
                  title="Achievements"
                  icon={<Trophy className="size-5 text-[#f59e0b]" />}
                  aside={
                    <span className="text-xs font-semibold text-(--cf-muted)">
                      <span className="num font-bold text-(--cf-text)">{earned.length}</span> / <span className="num font-bold text-(--cf-text)">{achievements.length}</span> unlocked
                    </span>
                  }
                >
                  <div className="no-scrollbar -mx-2 flex items-start gap-4 overflow-x-auto px-2 py-1 sm:grid sm:grid-cols-6 sm:gap-2">
                    {achievements.map((achievement) => (
                      <AchievementMedal
                        key={achievement.id}
                        achievement={achievement}
                        size={40}
                        className="flex-1"
                      />
                    ))}
                  </div>
                </Card>

                <Card title="Logic challenges" icon={<Puzzle className="size-5 text-[#8b5cf6]" />} aside={<span className="hidden text-xs text-(--cf-muted) sm:inline">Arrange one backend flow, block by block</span>}>
                  <ul className="grid gap-3 md:grid-cols-3">
                    {challengeCards.map((card) => {
                      const progress = challenges.find((row) => row.challengeId === card.id)
                      const isCompleted = !!progress?.completedAt
                      return (
                        <li key={card.id}>
                          <Tilt max={5} className="h-full rounded-2xl">
                            <div
                              className={cn(
                                'flex h-full flex-col justify-between rounded-2xl border p-4 transition-all duration-200',
                                card.active
                                  ? 'border-(--cf-border) bg-(--cf-panel) shadow-sm hover:border-[#8b5cf6] hover:shadow-md'
                                  : 'border-dashed border-(--cf-border) bg-(--cf-surface-2) opacity-70',
                              )}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#ede9fe] text-[#7c3aed] shadow-sm dark:bg-[#7c3aed]/25 dark:text-[#c4b5fd]">
                                    <Puzzle className="size-5" />
                                  </span>
                                  {card.active ? (
                                    isCompleted ? (
                                      <span className="flex items-center gap-1 rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-display font-extrabold text-[#15803d] dark:bg-[#15803d]/20 dark:text-[#86efac]">
                                        <Check className="size-3 stroke-[3]" />
                                        <span>Done</span>
                                      </span>
                                    ) : progress ? (
                                      <span className="rounded-full bg-[#e0f2fe] px-2 py-0.5 text-[10px] font-display font-bold text-[#0369a1] dark:bg-[#0369a1]/20 dark:text-[#7dd3fc]">
                                        In progress
                                      </span>
                                    ) : (
                                      <span className="rounded-full bg-(--cf-surface-2) px-2 py-0.5 text-[10px] font-display font-bold text-(--cf-muted)">
                                        {card.difficulty}
                                      </span>
                                    )
                                  ) : (
                                    <span className="flex items-center gap-1 rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-display font-bold text-(--cf-muted)">
                                      <LockKeyhole className="size-3" />
                                      <span>Locked</span>
                                    </span>
                                  )}
                                </div>

                                <h4 className="mt-3 font-display text-base font-extrabold text-(--cf-text)">
                                  {card.title}
                                </h4>
                                <p className="mt-1 text-xs leading-relaxed text-(--cf-muted)">
                                  {card.description}
                                </p>

                                {progress?.bestScore != null && (
                                  <div className="mt-2.5 flex items-center gap-1.5 text-xs text-(--cf-muted)">
                                    <span className="font-semibold">Best:</span>
                                    <Stars count={starsFor(progress.bestScore)} />
                                  </div>
                                )}
                              </div>

                              <div className="mt-4 border-t border-(--cf-border) pt-3">
                                {card.active ? (
                                  <Link
                                    href={`/challenge/${card.id}?stack=${challengeStack}`}
                                    className={cn(gameButtonClasses({ variant: 'secondary', size: 'sm', fullWidth: true }), 'font-display font-bold')}
                                  >
                                    <span>{progress?.completedAt ? 'Play again' : progress ? 'Continue' : 'Play challenge'}</span>
                                    <ArrowRight className="size-3.5" />
                                  </Link>
                                ) : (
                                  <button
                                    type="button"
                                    disabled
                                    aria-disabled="true"
                                    className="inline-flex h-8 w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-(--cf-border) bg-(--cf-surface-2) text-xs font-display font-semibold text-(--cf-faint)"
                                  >
                                    <LockKeyhole className="size-3" />
                                    <span>Locked</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </Tilt>
                        </li>
                      )
                    })}
                  </ul>
                </Card>
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-4">
                {journey && (
                  <GamePanel
                    as="section"
                    tone="accent"
                    accentColor="#22c55e"
                    className="glow-border animate-rise relative overflow-hidden"
                    title="Next quest"
                    icon={
                      <span className="grid size-7 place-items-center rounded-full bg-[#dcfce7] text-[#16a34a] dark:bg-[#16a34a]/20 dark:text-[#86efac]">
                        <Crosshair className="size-4" />
                      </span>
                    }
                  >
                    {/* Mascot peeking from top-right corner */}
                    <div className="pointer-events-none absolute -right-1 -top-1 size-9 overflow-hidden sm:size-10">
                      <Mascot expression="cheer" className="size-full" />
                    </div>

                    {next && nextWorld ? (
                      <>
                        <p className="font-display text-base font-extrabold leading-snug text-(--cf-text)">
                          {next.boss ? 'Defeat' : 'Pass'} “{next.title}”
                        </p>
                        <p className="mt-0.5 text-xs text-(--cf-muted)">
                          World {journey.worlds.indexOf(nextWorld) + 1} · {nextWorld.title} · {kindLabels[next.kind]}
                        </p>
                        <ul className="mt-3.5 flex flex-col gap-2 text-[13px] font-semibold">
                          <li className="flex items-center gap-2">
                            <span className="grid size-5 place-items-center rounded-md font-display text-[9px] font-extrabold text-white" style={{ background: 'linear-gradient(135deg, #a855f7, #6d28d9)' }}>
                              XP
                            </span>
                            <span>+<span className="num">{next.xp}</span> XP</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Flame className="size-5 fill-[#fb923c] text-[#f97316]" />
                            <span>{streak ? `Keeps your ${streak}-day streak going` : 'Starts a streak'}</span>
                          </li>
                          {next.boss && (
                            <li className="flex items-center gap-2 text-[#dc2626]">
                              <Skull className="size-5" />
                              <span>Boss level: bonus XP included</span>
                            </li>
                          )}
                        </ul>
                        <Link
                          href={`/learn/${journey.id}/${next.id}`}
                          className={cn(gameButtonClasses({ variant: 'primary', size: 'lg', fullWidth: true }), 'btn-shine-idle mt-5 font-display text-sm font-extrabold tracking-wide')}
                        >
                          <span>Start quest</span>
                          <ArrowRight className="size-4" />
                        </Link>
                      </>
                    ) : (
                      <div className="flex flex-col items-center py-2 text-center">
                        <div className="grid size-12 place-items-center rounded-2xl bg-[#fef3c7] text-[#d97706] shadow-sm dark:bg-[#78350f]/30 dark:text-[#fcd34d]">
                          <Trophy className="size-6" />
                        </div>
                        <p className="mt-3 font-display text-base font-extrabold text-(--cf-text)">Journey complete!</p>
                        <p className="mt-1 text-xs text-(--cf-muted)">Every level is passed. Replay any level to earn more stars.</p>
                        <Link
                          href={`/learn/${journey.id}`}
                          className={cn(gameButtonClasses({ variant: 'primary', size: 'lg', fullWidth: true }), 'mt-4 font-display text-sm font-extrabold')}
                        >
                          <span>Review the journey</span>
                          <ArrowRight className="size-4" />
                        </Link>
                      </div>
                    )}
                  </GamePanel>
                )}

                {journey && (
                  <GamePanel as="section" tone="default" title="Your progress" className="animate-rise [--delay:120ms]">
                    <div className="flex items-center gap-4">
                      <ProgressRing value={percent} passedCount={passedCount} totalCount={journey.levels.length} />
                      <div className="text-sm">
                        <div className="text-base font-extrabold font-display">
                          <span className="num">{passedCount}</span> / <span className="num">{journey.levels.length}</span> levels
                        </div>
                        <div className="text-xs text-(--cf-muted)">
                          <span className="num">{journey.worlds.filter((world) => journey.levels.filter((level) => level.world === world.id).every((level) => done[level.id])).length}</span> of <span className="num">{journey.worlds.length}</span> worlds cleared
                        </div>
                        <div className="mt-1 text-xs font-semibold text-[#7c3aed] dark:text-[#c4b5fd]">
                          <span className="num">{totalXp}</span> XP earned
                        </div>
                      </div>
                    </div>
                  </GamePanel>
                )}

                <Card title="Recent achievements" className="animate-rise [--delay:240ms]">
                  {earned.length ? (
                    <ul className="flex flex-col gap-3">
                      {earned.slice(-3).reverse().map((achievement, idx) => (
                        <li key={achievement.id} className="flex items-center gap-3">
                          <AchievementMedal achievement={achievement} size={40} hideTitle isNew={idx === 0} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-display text-sm font-bold text-(--cf-text)">{achievement.title}</span>
                              {idx === 0 && <Pill tone="xp" size="sm">NEW</Pill>}
                            </div>
                            <span className="block text-xs text-(--cf-muted)">{achievement.description}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-(--cf-muted)">Pass your first level to earn First Steps.</p>
                  )}
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
