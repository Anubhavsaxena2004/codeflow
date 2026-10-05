import type { LevelKind, Track } from '@/lib/journeys/types'
import { adminIsOpen } from './auth'
import { query } from './db'
import { listCatalog } from './journeys'

// Everything the admin's Learners view shows: who signed up, which journey each learner is on,
// the level they are at, and whether their project reached GitHub. One read per table, joined
// here, so it stays a handful of queries however many learners there are.

export interface ReportLevel {
  id: string
  title: string
  world: string
  kind: LevelKind
  boss: boolean
}

export interface ReportJourney {
  id: string
  title: string
  track: Track
  published: boolean
  worlds: { id: string; title: string }[]
  levels: ReportLevel[]
}

export interface PassedLevel {
  levelId: string
  stars: number
  xp: number
  attempts: number
  hints: number
  completedAt: string
}

export interface LearnerJourney {
  journeyId: string
  passed: PassedLevel[]
  /** Linked GitHub repository, if the learner has pushed or chosen one. */
  repo: { owner: string; repo: string; pushed: boolean; updatedAt: string } | null
}

export interface Learner {
  id: string
  name: string
  email: string
  track: Track | null
  joinedAt: string
  lastActiveAt: string
  github: string | null
  journeys: LearnerJourney[]
}

export interface LearnerReport {
  generatedAt: string
  /** No ADMIN_EMAILS: every signed-in user can open the admin. */
  open: boolean
  journeys: ReportJourney[]
  learners: Learner[]
}

const MAX_LEARNERS = 2000

export async function learnerReport(): Promise<LearnerReport> {
  const catalog = await listCatalog({ includeDrafts: true })
  const users = await query<Omit<Learner, 'journeys'>>(
    `SELECT u.id::text AS id, u.name, u.email, u.track, u.created_at AS "joinedAt", g.github_login AS github,
            GREATEST(u.created_at,
                     (SELECT max(s.created_at) FROM sessions s WHERE s.user_id = u.id),
                     (SELECT max(p.updated_at) FROM level_progress p WHERE p.user_id = u.id)) AS "lastActiveAt"
       FROM users u
       LEFT JOIN github_connections g ON g.user_id = u.id
      ORDER BY u.created_at
      LIMIT ${MAX_LEARNERS}`,
  )
  const progress = await query<PassedLevel & { userId: string; projectId: string }>(
    `SELECT user_id::text AS "userId", project_id AS "projectId", level_id AS "levelId", stars, xp, attempts,
            hints_used AS hints, completed_at AS "completedAt"
       FROM level_progress
      ORDER BY completed_at`,
  )
  const repos = await query<{ userId: string; journeyId: string; owner: string; repo: string; lastCommitSha: string | null; updatedAt: string }>(
    `SELECT user_id::text AS "userId", journey_id AS "journeyId", owner, repo, last_commit_sha AS "lastCommitSha", updated_at AS "updatedAt"
       FROM github_repos`,
  )

  const journeys: ReportJourney[] = catalog.map(({ project, published }) => ({
    id: project.id,
    title: project.title,
    track: project.track,
    published,
    worlds: project.worlds.map((world) => ({ id: world.id, title: world.title })),
    levels: project.levels.map((level) => ({ id: level.id, title: level.title, world: level.world, kind: level.kind, boss: !!level.boss })),
  }))

  const learners = users.map((user): Learner => {
    const mine = progress.filter((row) => row.userId === user.id)
    const myRepos = repos.filter((row) => row.userId === user.id)
    // The learner's stack, plus anything they have started or pushed on another one.
    const ids = new Set([
      ...journeys.filter((journey) => journey.published && journey.track === user.track).map((journey) => journey.id),
      ...mine.map((row) => row.projectId),
      ...myRepos.map((row) => row.journeyId),
    ])
    return {
      ...user,
      journeys: [...ids].map((journeyId) => {
        const repo = myRepos.find((row) => row.journeyId === journeyId)
        return {
          journeyId,
          passed: mine.filter((row) => row.projectId === journeyId).map(({ levelId, stars, xp, attempts, hints, completedAt }) => ({ levelId, stars, xp, attempts, hints, completedAt })),
          repo: repo ? { owner: repo.owner, repo: repo.repo, pushed: !!repo.lastCommitSha, updatedAt: repo.updatedAt } : null,
        }
      }),
    }
  })

  return { generatedAt: new Date().toISOString(), open: adminIsOpen(), journeys, learners }
}
