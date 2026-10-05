import { computeScore, starsFor } from '@/lib/scoring'
import type { Level, LevelKind, LevelProgress } from './types'

export const XP_BY_KIND: Record<LevelKind, number> = { explore: 50, command: 75, edit: 100, build: 100, bugfix: 150, architecture: 150 }
export const BOSS_BONUS = 100
export const XP_PER_RANK = 500

export function xpFor(level: Level) {
  return level.xp ?? XP_BY_KIND[level.kind] + (level.boss ? BOSS_BONUS : 0)
}

/** Same scoring as the standalone challenges: a wrong try costs 10, a hint 15. */
export function levelStars(wrongAttempts: number, hints: number) {
  return starsFor(computeScore({ wrongChecks: wrongAttempts, hints }))
}

export function rankFor(xp: number) {
  return { rank: Math.floor(xp / XP_PER_RANK) + 1, into: xp % XP_PER_RANK, size: XP_PER_RANK }
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

export function isUnlocked(project: { levels: { id: string }[] }, levelIndex: number, done: Record<string, LevelProgress> | undefined) {
  return levelIndex < unlockedCount(project, done)
}

const dayOf = (iso: string) => new Date(iso).toISOString().slice(0, 10)

/** Consecutive days, ending today or yesterday, with at least one passed level. */
export function streakDays(rows: LevelProgress[], now = new Date()) {
  const days = new Set(rows.map((row) => dayOf(row.completedAt)))
  const cursor = new Date(now)
  if (!days.has(dayOf(cursor.toISOString()))) cursor.setUTCDate(cursor.getUTCDate() - 1)
  let streak = 0
  while (days.has(dayOf(cursor.toISOString()))) {
    streak++
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
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
