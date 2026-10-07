import { MAX_DRAFT_CHARS } from '@/lib/journeys/draft'
import type { Solution } from '@/lib/journeys/types'
import { jsonError, readBody, withUser } from '@/lib/server/api'
import { query } from '@/lib/server/db'
import { getPublishedProject } from '@/lib/server/journeys'

type Context = { params: Promise<{ projectId: string; levelId: string }> }

const UNDEFINED_TABLE = '42P01'
const missingTable = (error: unknown) => (error as { code?: string }).code === UNDEFINED_TABLE

async function levelOf(context: Context) {
  const { projectId, levelId } = await context.params
  const project = await getPublishedProject(projectId)
  return project?.levels.some((level) => level.id === levelId) ? { projectId: project.id, levelId } : null
}

/**
 * What the learner has done in this level so far (`draft`), and the solution they passed it with
 * (`solution`), so a refresh or a trip to the map resumes exactly where they were.
 */
export async function GET(_request: Request, context: Context) {
  return withUser(async (user) => {
    const target = await levelOf(context)
    if (!target) return jsonError(404, 'Unknown level.')

    const [passed] = await query<{ solution: Solution }>(
      'SELECT solution FROM level_progress WHERE user_id = $1 AND project_id = $2 AND level_id = $3',
      [user.id, target.projectId, target.levelId],
    )
    let draft: unknown = null
    try {
      const [row] = await query<{ state: unknown }>(
        'SELECT state FROM level_drafts WHERE user_id = $1 AND project_id = $2 AND level_id = $3',
        [user.id, target.projectId, target.levelId],
      )
      draft = row?.state ?? null
    } catch (error) {
      // Before migration 006 the level still works; it just starts fresh.
      if (!missingTable(error)) throw error
    }
    return Response.json({ draft, solution: passed?.solution ?? null })
  })
}

/** Saves the level as it stands. Body: { state }. The client debounces calls. */
export async function PUT(request: Request, context: Context) {
  return withUser(async (user) => {
    const target = await levelOf(context)
    if (!target) return jsonError(404, 'Unknown level.')

    const body = await readBody(request)
    const state = body?.state
    if (!state || typeof state !== 'object' || Array.isArray(state)) return jsonError(400, 'Send { state } as an object.')
    const json = JSON.stringify(state)
    if (json.length > MAX_DRAFT_CHARS) return jsonError(413, 'This level is too large to save. Remove some code and try again.')

    try {
      await query(
        `INSERT INTO level_drafts (user_id, project_id, level_id, state)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, project_id, level_id)
         DO UPDATE SET state = EXCLUDED.state, updated_at = now()`,
        [user.id, target.projectId, target.levelId, json],
      )
    } catch (error) {
      if (missingTable(error)) return jsonError(503, 'Saving level progress needs the latest database migration (npm run db:migrate).')
      throw error
    }
    return Response.json({ ok: true })
  })
}
