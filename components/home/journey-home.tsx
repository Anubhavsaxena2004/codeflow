'use client'

import { useMemo, useState, type ComponentType } from 'react'
import Link from 'next/link'
import { ArrowRight, Bug, Check, Circle, Flame, House, LockKeyhole, LogOut, Network, PencilRuler, Shield, Skull, SquareTerminal, Star, Trophy, UserRound } from 'lucide-react'
import { kindIcons, Stars, worldThemes } from '@/components/journey/level-meta'
import { achievementsFor, indexProgress, rankFor, streakDays, type Achievement } from '@/lib/journeys/progress'
import { kindLabels, tracks, trackIds, type LevelProgress, type Track } from '@/lib/journeys/types'
import type { LevelSummary, ProjectSummary } from '@/lib/server/journeys'
import { starsFor } from '@/lib/scoring'
import { useLearner } from '@/lib/use-learner'
import { cn } from '@/lib/utils'
import { TrackPicker } from './track-picker'

type IconType = ComponentType<{ className?: string }>

const challengeCards = [
  { id: 'signup', title: 'Signup Flow', description: 'Arrange validation, hashing, persistence and a safe response.', difficulty: 'Intermediate', active: true },
  { id: 'login', title: 'Login Flow', description: 'Coming soon: verify credentials without leaking information.', difficulty: 'Intermediate', active: false },
  { id: 'jwt', title: 'JWT Auth Middleware', description: 'Coming soon: protect routes and handle expired tokens.', difficulty: 'Advanced', active: false },
]

const achievementIcons: Record<Achievement['icon'], IconType> = { trophy: Trophy, bug: Bug, terminal: SquareTerminal, star: Star, network: Network, skull: Skull }

type LevelState = 'done' | 'current' | 'locked'

function NavLink({ href, icon: Icon, label, active }: { href: string; icon: IconType; label: string; active?: boolean }) {
  return (
    <Link href={href} className={cn('flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition', active ? 'bg-[#dcfce7] text-[#166534]' : 'text-[#4b5563] hover:bg-[#f3f4f6]')}>
      <Icon className="size-4" />
      {label}
    </Link>
  )
}

function Card({ title, children, className, aside }: { title?: string; children: React.ReactNode; className?: string; aside?: React.ReactNode }) {
  return (
    <section className={cn('rounded-2xl border border-[#e6e9f0] bg-white p-4 shadow-sm', className)}>
      {title && (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#1f2440]">{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  )
}

function ProgressRing({ value }: { value: number }) {
  return (
    <div className="relative size-20 shrink-0">
      <svg viewBox="0 0 36 36" className="size-20 -rotate-90" aria-hidden>
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" pathLength={100} strokeDasharray={`${value} 100`} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-base font-bold text-[#1f2440]">{value}%</span>
    </div>
  )
}

function LevelNode({ level, number, state, row, selected, initials, theme, onSelect }: {
  level: LevelSummary
  number: number
  state: LevelState
  row?: LevelProgress
  selected: boolean
  initials: string
  theme: (typeof worldThemes)[keyof typeof worldThemes]
  onSelect: () => void
}) {
  return (
    <div className="relative flex flex-col items-center">
      {state === 'current' && (
        <span className="absolute -top-8 flex items-center gap-1 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#1f2440] shadow">
          <span className="grid size-4 place-items-center rounded-full bg-[#16a34a] text-[8px] text-white">{initials}</span>
          You are here
        </span>
      )}
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`Level ${number}: ${level.title}${level.boss ? ' (boss)' : ''}, ${state === 'done' ? 'passed' : state === 'current' ? 'next up' : 'locked'}`}
        className={cn(
          'relative grid place-items-center rounded-full text-sm font-bold shadow-md transition hover:scale-105',
          level.boss ? 'size-14' : 'size-11',
          state === 'done' && cn(theme.badge, 'text-white'),
          state === 'current' && 'bg-white text-[#1f2440] ring-4 ring-[#16a34a]',
          state === 'locked' && 'bg-[#e5e7eb] text-[#9ca3af] shadow-none',
          level.boss && state !== 'locked' && 'ring-4 ring-[#ef4444]/70',
          selected && 'outline-2 outline-offset-4 outline-[#1f2440]',
        )}
      >
        {state === 'current' && <span aria-hidden className="absolute inset-0 animate-ping rounded-full ring-2 ring-[#16a34a]/50 motion-reduce:animate-none" />}
        {state === 'locked' ? <LockKeyhole className="size-4" /> : level.boss ? <Skull className="size-6" /> : number}
      </button>
      <span className="mt-1 h-3">{row ? <Stars count={row.stars} /> : level.boss ? <span className="text-[9px] font-bold tracking-wider text-[#ef4444]">BOSS</span> : null}</span>
    </div>
  )
}

export function JourneyHome({ journeys, initialJourney }: { journeys: ProjectSummary[]; initialJourney: string | null }) {
  const { session, track, setTrack, levels, challenges, ready } = useLearner()
  const [picking, setPicking] = useState(false)
  const [journeyId, setJourneyId] = useState<string | null>(initialJourney)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const trackJourneys = journeys.filter((journey) => journey.track === track)
  const journey = trackJourneys.find((item) => item.id === journeyId) ?? trackJourneys[0] ?? null
  const done = useMemo(() => (journey ? indexProgress(levels)[journey.id] ?? {} : {}), [journey, levels])
  const currentIndex = journey ? journey.levels.findIndex((level) => !done[level.id]) : -1
  const stateOf = (index: number): LevelState => (done[journey!.levels[index].id] ? 'done' : index === currentIndex ? 'current' : 'locked')
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

  const pickTrack = (next: Track) => {
    void setTrack(next)
    setPicking(false)
    setJourneyId(null)
    setSelectedId(null)
  }

  // The selected level's card: under the map on narrow screens, in the side column on wide ones.
  const renderDetails = () => {
    if (!journey || !selected) return null
    const state = stateOf(selectedIndex)
    const KindIcon = kindIcons[selected.kind]
    const worldNumber = journey.worlds.findIndex((world) => world.id === selected.world) + 1
    const row = done[selected.id]
    return (
      <Card title={state === 'current' ? 'Next up' : 'Level details'} aside={<span className="text-[11px] text-[#6b7280]">World {worldNumber} · Level {selectedIndex + 1}</span>}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-[#f3f4f6] px-2 py-0.5 text-[11px] font-semibold text-[#4b5563]">
            <KindIcon className="size-3" /> {kindLabels[selected.kind]}
          </span>
          {selected.boss && <span className="inline-flex items-center gap-1 rounded-md bg-[#fee2e2] px-2 py-0.5 text-[11px] font-semibold text-[#b91c1c]"><Skull className="size-3" /> Boss</span>}
          {row && <Stars count={row.stars} className="ml-auto" />}
        </div>
        <h3 className="mt-2 font-semibold">{selected.title}</h3>
        <p className="mt-1 text-xs leading-5 text-[#4b5563]">{selected.summary}</p>
        <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Your mission</div>
        <ul className="mt-1.5 flex flex-col gap-1.5">
          {selected.tasks.map((task) => (
            <li key={task} className="flex gap-2 text-xs leading-5 text-[#374151]">
              {row ? <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-[#16a34a]" /> : <Circle aria-hidden className="mt-0.5 size-3.5 shrink-0 text-[#9ca3af]" />}
              {task}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-xs font-semibold text-[#7c3aed]"><Star className="size-3.5 fill-current" /> +{selected.xp} XP</span>
          {state === 'locked' ? (
            <span className="flex items-center gap-1 text-xs text-[#9ca3af]"><LockKeyhole className="size-3.5" /> Pass the levels before it</span>
          ) : (
            <Link href={`/learn/${journey.id}/${selected.id}`} className="flex items-center gap-1.5 rounded-xl bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#15803d]">
              {row ? 'Replay' : selected.boss ? 'Enter battle' : 'Start level'} <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </Card>
    )
  }
  const details = renderDetails()

  return (
    <div className="min-h-dvh bg-[#f5f7fb] text-[#1f2440] lg:flex">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[#e6e9f0] bg-white p-4 lg:flex">
        <Link href="/" className="flex items-center gap-2 px-1">
          <span className="grid size-9 place-items-center rounded-xl bg-[#16a34a] text-sm font-bold text-white">{'</>'}</span>
          <span>
            <span className="block text-lg font-bold leading-5">CodeFlow</span>
            <span className="block text-[11px] text-[#6b7280]">Learn · Build · Level up</span>
          </span>
        </Link>
        <nav aria-label="Main" className="mt-6 flex flex-col gap-1">
          <NavLink href="/" icon={House} label="Home" active />
          <NavLink href="/profile" icon={UserRound} label="Profile" />
          {session.user?.isAdmin && <NavLink href="/admin" icon={Shield} label="Admin" />}
          <NavLink href="/mentor" icon={PencilRuler} label="Mentor mode" />
        </nav>
        <div className="mt-auto rounded-2xl bg-[#f0fdf4] p-4 text-xs leading-5 text-[#166534]">
          <span className="text-sm font-semibold">Small steps build big developers.</span>
          <span className="mt-1 block text-[#4b5563]">Every level adds real files to a real project you can push to GitHub.</span>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Header */}
        <header className="flex flex-wrap items-center gap-3 border-b border-[#e6e9f0] bg-white px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <span className="grid size-8 place-items-center rounded-lg bg-[#16a34a] text-xs font-bold text-white">{'</>'}</span>
            <span className="font-bold">CodeFlow</span>
          </Link>
          <div className="hidden lg:block">
            <h1 className="text-xl font-bold">Your coding journey</h1>
            <p className="text-xs text-[#6b7280]">Build real projects level by level, fix planted bugs, and push what you build to GitHub.</p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {track && (
              <button type="button" onClick={() => setPicking(true)} className="rounded-full border border-[#e6e9f0] px-3 py-1.5 text-xs font-semibold hover:bg-[#f3f4f6]" title="Change your tech stack">
                {tracks[track].label} stack
              </button>
            )}
            <span className="flex items-center gap-1.5 rounded-full border border-[#fde68a] bg-[#fffbeb] px-3 py-1.5 text-xs font-semibold text-[#b45309]" title="Days in a row with a passed level">
              <Flame aria-hidden className="size-3.5" /> {streak} day streak
            </span>
            <span className="flex items-center gap-2 rounded-full border border-[#e6e9f0] px-3 py-1.5 text-xs" title={`${totalXp} XP in total`}>
              <span className="rounded-md bg-[#7c3aed] px-1.5 py-0.5 text-[10px] font-bold text-white">XP</span>
              <span className="font-semibold">Rank {rank.rank}</span>
              <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-[#e5e7eb] sm:block">
                <span className="block h-full rounded-full bg-[#7c3aed]" style={{ width: `${(rank.into / rank.size) * 100}%` }} />
              </span>
              <span className="text-[#6b7280]">{rank.into}/{rank.size}</span>
            </span>
            {session.status === 'signed-in' ? (
              <span className="flex items-center gap-1">
                <Link href="/profile" title={`${session.user.name} · ${session.user.email}`} className="grid size-8 place-items-center rounded-full bg-[#16a34a] text-xs font-semibold text-white">{initials}</Link>
                <button type="button" onClick={session.signOut} aria-label="Sign out" title="Sign out" className="rounded-full p-1.5 text-[#6b7280] hover:bg-[#f3f4f6]">
                  <LogOut className="size-4" />
                </button>
              </span>
            ) : session.status === 'guest' ? (
              <Link href="/login" className="rounded-full bg-[#1f2440] px-4 py-1.5 text-xs font-semibold text-white">Sign in</Link>
            ) : null}
          </div>
          <nav aria-label="Main" className="flex w-full gap-1 overflow-x-auto lg:hidden">
            <NavLink href="/" icon={House} label="Home" active />
            <NavLink href="/profile" icon={UserRound} label="Profile" />
            {session.user?.isAdmin && <NavLink href="/admin" icon={Shield} label="Admin" />}
          </nav>
        </header>

        <main className="p-4 md:p-6">
          {session.status === 'guest' && ready && track && (
            <p className="mb-4 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-2.5 text-xs text-[#1e40af]">
              Playing as a guest: your progress stays in this browser. <Link href="/register" className="font-semibold underline">Create an account</Link> to keep it everywhere and push your project to GitHub.
            </p>
          )}

          {!ready ? (
            <div className="grid h-64 place-items-center text-sm text-[#6b7280]">Loading your journey…</div>
          ) : !track || picking ? (
            <Card className="mx-auto max-w-3xl p-6">
              <h2 className="text-lg font-bold">{track ? 'Change your tech stack' : 'Pick your tech stack'}</h2>
              <p className="mb-5 mt-1 text-sm text-[#6b7280]">Your journey, challenges and code all follow the stack you choose. You can switch any time; progress in each stack is kept.</p>
              <TrackPicker value={track} onPick={pickTrack} journeyCounts={journeyCounts} />
              {track && (
                <button type="button" onClick={() => setPicking(false)} className="mt-4 text-sm text-[#6b7280] underline-offset-4 hover:underline">Cancel</button>
              )}
            </Card>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0">
                {trackJourneys.length > 1 && (
                  <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Projects">
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
                        className={cn('rounded-full px-4 py-1.5 text-sm font-semibold', item.id === journey?.id ? 'bg-[#1f2440] text-white' : 'bg-white text-[#4b5563] shadow-sm')}
                      >
                        {number + 1}. {item.title}
                      </button>
                    ))}
                  </div>
                )}

                {journey ? (
                  <>
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-bold">{journey.title}</h2>
                        <p className="text-sm text-[#6b7280]">{journey.summary}</p>
                      </div>
                      <Link href={`/learn/${journey.id}`} className="flex items-center gap-1.5 rounded-xl bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#15803d]">
                        {passedCount === 0 ? 'Start the journey' : currentIndex < 0 ? 'Review the journey' : 'Continue'} <ArrowRight className="size-4" />
                      </Link>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {journey.worlds.map((world, worldNumber) => {
                        const theme = worldThemes[world.theme]
                        const WorldIcon = theme.icon
                        const inWorld = journey.levels.map((level, index) => ({ level, index })).filter(({ level }) => level.world === world.id)
                        const complete = inWorld.length > 0 && inWorld.every(({ level }) => done[level.id])
                        const reached = inWorld.some(({ index }) => stateOf(index) !== 'locked')
                        return (
                          <section key={world.id} className={cn('rounded-3xl bg-gradient-to-br p-4 ring-1', theme.tint, theme.ring, !reached && 'opacity-75 grayscale-[35%]')}>
                            <header className="flex items-center gap-3">
                              <span className={cn('grid size-10 place-items-center rounded-xl text-white shadow', theme.badge)}>
                                <WorldIcon className="size-5" />
                              </span>
                              <div className="min-w-0">
                                <div className={cn('text-[11px] font-semibold uppercase tracking-wider', theme.text)}>World {worldNumber + 1}</div>
                                <div className="truncate font-semibold">{world.title}</div>
                              </div>
                              <span className="ml-auto">
                                {complete ? <Check aria-label="World complete" className="size-5 text-[#16a34a]" /> : !reached ? <LockKeyhole aria-label="Locked" className="size-4 text-[#9ca3af]" /> : null}
                              </span>
                            </header>
                            <p className="mt-1 text-xs text-[#4b5563]">{world.subtitle}</p>
                            <ol className="mt-9 flex flex-wrap items-center gap-y-10 pb-2">
                              {inWorld.map(({ level, index }, position) => (
                                <li key={level.id} className={cn('flex items-center', position % 2 ? 'translate-y-3' : '-translate-y-1')}>
                                  {position > 0 && <span aria-hidden className={cn('mx-1 w-4 border-t-2 border-dashed sm:w-5', done[level.id] ? 'border-[#16a34a]' : 'border-[#9ca3af]/60')} />}
                                  <LevelNode
                                    level={level}
                                    number={index + 1}
                                    state={stateOf(index)}
                                    row={done[level.id]}
                                    selected={selected?.id === level.id}
                                    initials={initials}
                                    theme={theme}
                                    onSelect={() => setSelectedId(level.id)}
                                  />
                                </li>
                              ))}
                            </ol>
                          </section>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <Card className="p-6">
                    <h2 className="font-semibold">The {tracks[track].label} journey is being built</h2>
                    <p className="mt-1 text-sm text-[#6b7280]">
                      Meanwhile, the Signup Flow challenge below has a {tracks[track].label} version, or switch stacks to start a journey that is ready.
                    </p>
                  </Card>
                )}

                <div className="mt-4 xl:hidden">{details}</div>

                <Card title="Achievements" className="mt-5">
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {achievements.map((achievement) => {
                      const Icon = achievementIcons[achievement.icon]
                      const got = achievement.current >= achievement.target
                      return (
                        <li key={achievement.id} className={cn('flex gap-3 rounded-xl border p-3', got ? 'border-[#bbf7d0] bg-[#f0fdf4]' : 'border-[#e6e9f0]')}>
                          <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', got ? 'bg-[#16a34a] text-white' : 'bg-[#f3f4f6] text-[#9ca3af]')}>
                            <Icon className="size-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold">{achievement.title}</div>
                            <div className="text-xs text-[#6b7280]">{achievement.description}</div>
                            {achievement.target > 1 && (
                              <div className="mt-1.5 flex items-center gap-2">
                                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e5e7eb]">
                                  <span className="block h-full rounded-full bg-[#16a34a]" style={{ width: `${(achievement.current / achievement.target) * 100}%` }} />
                                </span>
                                <span className="text-[10px] text-[#6b7280]">{achievement.current}/{achievement.target}</span>
                              </div>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </Card>

                <Card title="Logic challenges" className="mt-5" aside={<span className="text-xs text-[#6b7280]">Arrange one backend flow, block by block</span>}>
                  <ul className="grid gap-3 md:grid-cols-3">
                    {challengeCards.map((card) => {
                      const progress = challenges.find((row) => row.challengeId === card.id)
                      const body = (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">{card.title}</span>
                            {card.active ? <ArrowRight className="size-4 text-[#16a34a]" /> : <LockKeyhole className="size-3.5 text-[#9ca3af]" />}
                          </div>
                          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">{card.difficulty}</div>
                          <p className="mt-2 text-xs leading-5 text-[#4b5563]">{card.description}</p>
                          {card.active && (
                            <div className="mt-2 flex items-center justify-between border-t border-[#e6e9f0] pt-2 text-[11px] text-[#6b7280]">
                              <span>{progress?.completedAt ? 'Completed · play again' : progress ? 'Continue' : `Open in ${tracks[track].label}`}</span>
                              {progress?.bestScore != null ? <Stars count={starsFor(progress.bestScore)} /> : null}
                            </div>
                          )}
                        </>
                      )
                      return (
                        <li key={card.id}>
                          {card.active ? (
                            <Link href={`/challenge/${card.id}?stack=${challengeStack}`} className="block h-full rounded-xl border border-[#e6e9f0] p-3 transition hover:border-[#16a34a] hover:shadow-sm">{body}</Link>
                          ) : (
                            <div className="h-full rounded-xl border border-dashed border-[#e6e9f0] p-3 opacity-70">{body}</div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </Card>
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-4">
                <div className="hidden xl:block">{details}</div>

                {journey && (
                  <Card title="Your progress">
                    <div className="flex items-center gap-4">
                      <ProgressRing value={percent} />
                      <div className="text-sm">
                        <div className="font-semibold">{passedCount} / {journey.levels.length} levels</div>
                        <div className="text-xs text-[#6b7280]">{journey.worlds.filter((world) => journey.levels.filter((level) => level.world === world.id).every((level) => done[level.id])).length} of {journey.worlds.length} worlds cleared</div>
                        <div className="mt-1 text-xs text-[#6b7280]">{totalXp} XP earned</div>
                      </div>
                    </div>
                  </Card>
                )}

                <Card title="Recent achievements">
                  {earned.length ? (
                    <ul className="flex flex-col gap-3">
                      {earned.slice(-3).reverse().map((achievement) => {
                        const Icon = achievementIcons[achievement.icon]
                        return (
                          <li key={achievement.id} className="flex items-center gap-3">
                            <span className="grid size-9 place-items-center rounded-full bg-[#fef3c7] text-[#b45309]"><Icon className="size-4" /></span>
                            <span>
                              <span className="block text-sm font-semibold">{achievement.title}</span>
                              <span className="block text-xs text-[#6b7280]">{achievement.description}</span>
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="text-xs text-[#6b7280]">Pass your first level to earn First Steps.</p>
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
