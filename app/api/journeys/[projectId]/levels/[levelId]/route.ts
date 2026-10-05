import { isExcludedPath, isValidPath } from '@/lib/github/filter'
import { replaceProjectFiles } from '@/lib/github/store'
import { levelStars, xpFor } from '@/lib/journeys/progress'
import { projectSnapshot } from '@/lib/journeys/snapshot'
import type { LevelProgress, Solution, Submission } from '@/lib/journeys/types'
import { verifyLevel } from '@/lib/journeys/verify'
import { isInt, jsonError, readBody, withUser } from '@/lib/server/api'
import { query } from '@/lib/server/db'
import { getPublishedProject } from '@/lib/server/journeys'

type Context = { params: Promise<{ projectId: string; levelId: string }> }

/**
 * Passes a level. The submission is verified here, not trusted from the client; wrong-attempt
 * and hint counts are client-reported, like the challenge attempts. On success the learner's
 * project, as it stands after their furthest passed level, is saved for the GitHub push.
 */
export async function POST(request: Request, context: Context) {
  return withUser(async (user) => {
    const { projectId, levelId } = await context.params
    const project = await getPublishedProject(projectId)
    const index = project?.levels.findIndex((level) => level.id === levelId) ?? -1
    if (!project || index < 0) return jsonError(404, 'Unknown level.')
    const level = project.levels[index]

    const body = await readBody(request)
    const submission = body?.submission
    const { wrongAttempts, hints } = body ?? {}
    if (!submission || typeof submission !== 'object' || Array.isArray(submission) || !isInt(wrongAttempts, 0, 10_000) || !isInt(hints, 0, 1000)) {
      return jsonError(400, 'Invalid submission.')
    }

    const passed = await query<{ levelId: string; solution: Solution }>(
      'SELECT level_id AS "levelId", solution FROM level_progress WHERE user_id = $1 AND project_id = $2',
      [user.id, project.id],
    )
    const done = new Set(passed.map((row) => row.levelId))
    // Replaying a passed level is always allowed, even if a level was added before it since.
    const blocking = done.has(level.id) || user.allLevelsOpen ? undefined : project.levels.slice(0, index).find((earlier) => !done.has(earlier.id))
    if (blocking) return jsonError(409, `Finish "${blocking.title}" first.`)

    const verdict = verifyLevel(level, submission as Submission)
    if (!verdict.ok) return jsonError(422, verdict.error)

    const [progress] = await query<LevelProgress>(
      `INSERT INTO level_progress AS p (user_id, project_id, level_id, stars, xp, attempts, hints_used, solution)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, project_id, level_id) DO UPDATE SET
         stars      = GREATEST(p.stars, EXCLUDED.stars),
         attempts   = p.attempts + EXCLUDED.attempts,
         solution   = EXCLUDED.solution,
         updated_at = now()
       RETURNING project_id AS "projectId", level_id AS "levelId", stars, xp, completed_at AS "completedAt"`,
      [user.id, project.id, level.id, levelStars(wrongAttempts, hints), xpFor(level), wrongAttempts + 1, hints, JSON.stringify(verdict.solution)],
    )

    // The repo snapshot runs up to the first level not yet passed (replaying an old level keeps later work).
    done.add(level.id)
    const solutions: Record<string, Solution> = Object.fromEntries(passed.map((row) => [row.levelId, row.solution]))
    solutions[level.id] = verdict.solution
    let reached = 0
    while (reached < project.levels.length && done.has(project.levels[reached].id)) reached++
    const files = projectSnapshot(project, reached, solutions).filter((file) => isValidPath(file.path) && !isExcludedPath(file.path))
    if (files.length) await replaceProjectFiles(user.id, project.id, files)

    return Response.json({ progress, savedFiles: files.length })
  })
}
