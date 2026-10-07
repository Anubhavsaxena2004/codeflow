import { computeScore, starsFor } from '@/lib/scoring'
import type { Level, LevelKind, LevelProgress } from './types'

export const XP_BY_KIND: Record<LevelKind, number> = { explore: 50, command: 75, edit: 100, build: 100, bugfix: 150, architecture: 150 }
export const BOSS_BONUS = 100
export const XP_PER_LEVEL = 500

export function xpFor(level: Level) {
  return level.xp ?? XP_BY_KIND[level.kind] + (level.boss ? BOSS_BONUS : 0)
}

/** Same scoring as the standalone challenges: a wrong try costs 10, a hint 15. */
export function levelStars(wrongAttempts: number, hints: number) {
  return starsFor(computeScore({ wrongChecks: wrongAttempts, hints }))
}

/** The player level: every XP_PER_LEVEL XP raises it by one. */
export function playerLevelFor(xp: number) {
  return { level: Math.floor(xp / XP_PER_LEVEL) + 1, into: xp % XP_PER_LEVEL, size: XP_PER_LEVEL }
}

/**
 * The career post, from total XP. The steps are deliberately far apart: the whole MERN Todo
 * journey is about 2,300 XP, so one or two small projects make a Trainee, not a Developer.
 */
export const POSTS = [
  { title: 'Intern', xp: 0 },
  { title: 'Trainee', xp: 1_500 },
  { title: 'Junior Developer', xp: 5_000 },
  { title: 'Developer', xp: 12_000 },
  { title: 'Senior Developer', xp: 25_000 },
  { title: 'Tech Lead', xp: 45_000 },
  { title: 'Software Architect', xp: 75_000 },
  { title: 'Principal Engineer', xp: 120_000 },
] as const

export function postFor(xp: number) {
  let index = 0
  while (index + 1 < POSTS.length && xp >= POSTS[index + 1].xp) index++
  const next = POSTS[index + 1] ?? null
  return {
    index,
    title: POSTS[index].title,
    next,
    /** XP still needed for the next post; 0 at the top. */
    toNext: next ? next.xp - xp : 0,
    /** 0–1 progress from this post to the next one. */
    progress: next ? (xp - POSTS[index].xp) / (next.xp - POSTS[index].xp) : 1,
  }
}

export type ProgressIndex = Record<string, Record<string, LevelProgress>>

export function indexProgress(rows: LevelProgress[]): ProgressIndex {
  const index: ProgressIndex = {}
  for (const row of rows) (index[row.projectId] ??= {})[row.levelId] = row
  return index
}

/** Levels unlock in order: a level opens once every level before it is passed. */
export function unlockedCount(project: { levels: { id: string }[] }, done: Record<string, LevelProgress> | undefined) {
  const firstOpen = project.levels.findIndex((level) => !done?.[level.id])
  return firstOpen < 0 ? project.levels.length : firstOpen + 1
}

/**
 * A passed level stays open even when a level added before it later is not passed yet.
 * `allOpen` is for learners an admin opened every level for.
 */
export function isUnlocked(project: { levels: { id: string }[] }, levelIndex: number, done: Record<string, LevelProgress> | undefined, allOpen = false) {
  return allOpen || levelIndex < unlockedCount(project, done) || !!done?.[project.levels[levelIndex]?.id]
}

/** The learner's own calendar day (local time), as YYYY-MM-DD. */
export function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** How many levels were passed on each day. */
export function activityByDay(rows: { completedAt: string }[]) {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const key = dayKey(new Date(row.completedAt))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

/** Consecutive days, ending today or yesterday, with at least one passed level. */
export function streakDays(rows: { completedAt: string }[], now = new Date()) {
  const days = activityByDay(rows)
  const cursor = new Date(now)
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (days.has(dayKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/** The longest run of consecutive active days ever. */
export function longestStreak(rows: { completedAt: string }[]) {
  const days = [...activityByDay(rows).keys()].sort()
  let best = 0
  let run = 0
  let previous: Date | null = null
  for (const key of days) {
    const [year, month, day] = key.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    const expected = previous && new Date(previous.getFullYear(), previous.getMonth(), previous.getDate() + 1)
    run = expected && expected.getTime() === date.getTime() ? run + 1 : 1
    best = Math.max(best, run)
    previous = date
  }
  return best
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: 'trophy' | 'bug' | 'terminal' | 'star' | 'network' | 'skull'
  current: number
  target: number
}

type LevelShape = Pick<Level, 'id' | 'kind' | 'boss'>

/** Derived from progress, so there is nothing extra to store. Works on full projects or map summaries. */
export function achievementsFor(projects: { id: string; levels: LevelShape[] }[], rows: LevelProgress[]): Achievement[] {
  const levels = new Map<string, LevelShape>()
  for (const project of projects) for (const level of project.levels) levels.set(`${project.id}/${level.id}`, level)
  const passed = rows.map((row) => ({ row, level: levels.get(`${row.projectId}/${row.levelId}`) })).filter((entry) => entry.level)
  const count = (test: (level: LevelShape, row: LevelProgress) => boolean) => passed.filter(({ level, row }) => test(level!, row)).length

  return [
    { id: 'first-steps', title: 'First Steps', description: 'Pass your first level', icon: 'trophy', current: Math.min(passed.length, 1), target: 1 },
    { id: 'shell-hero', title: 'Shell Hero', description: 'Pass 3 terminal levels', icon: 'terminal', current: count((level) => level.kind === 'command'), target: 3 },
    { id: 'bug-slayer', title: 'Bug Slayer', description: 'Win 3 bug hunts', icon: 'bug', current: count((level) => level.kind === 'bugfix'), target: 3 },
    { id: 'no-hints', title: 'No Hints Needed', description: 'Earn 3 stars on 5 levels', icon: 'star', current: count((_, row) => row.stars === 3), target: 5 },
    { id: 'boss-slayer', title: 'Boss Slayer', description: 'Defeat a boss level', icon: 'skull', current: Math.min(count((level) => !!level.boss), 1), target: 1 },
    { id: 'architect', title: 'Architect', description: 'Trace a request end to end', icon: 'network', current: Math.min(count((level) => level.kind === 'architecture'), 1), target: 1 },
  ].map((achievement) => ({ ...achievement, current: Math.min(achievement.current, achievement.target) }) as Achievement)
}
