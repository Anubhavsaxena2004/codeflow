import { getChallenge } from '@/data/challenges'
import { readLearnerFiles } from '@/lib/journeys/draft'
import { jsonError, readBody, withUser } from '@/lib/server/api'
import { query } from '@/lib/server/db'
import { getPublishedProject } from '@/lib/server/journeys'

// Files and folders a learner creates with New File / New Folder in the explorer. One document per
// journey (scope = journey id) or challenge (scope = "challenge:<id>").

const UNDEFINED_TABLE = '42P01'
const missingTable = (error: unknown) => (error as { code?: string }).code === UNDEFINED_TABLE

/** The scope when it names a published journey or a known challenge, otherwise null. */
async function scopeOf(value: unknown): Promise<string | null> {
  if (typeof value !== 'string' || !value) return null
  if (value.startsWith('challenge:')) return getChallenge(value.slice('challenge:'.length)) ? value : null
  return (await getPublishedProject(value)) ? value : null
}

export async function GET(request: Request) {
  return withUser(async (user) => {
    const scope = await scopeOf(new URL(request.url).searchParams.get('scope'))
    if (!scope) return jsonError(404, 'Unknown journey or challenge.')
    try {
      const [row] = await query<{ files: unknown }>('SELECT files FROM learner_files WHERE user_id = $1 AND scope = $2', [user.id, scope])
      return Response.json(readLearnerFiles(row?.files))
    } catch (error) {
      if (missingTable(error)) return Response.json(readLearnerFiles(null))
      throw error
    }
  })
}

/** Replaces the learner's files for one scope. Body: { scope, files: { files, folders } }. */
export async function PUT(request: Request) {
  return withUser(async (user) => {
    const body = await readBody(request)
    const scope = await scopeOf(body?.scope)
    if (!scope) return jsonError(404, 'Unknown journey or challenge.')
    const files = readLearnerFiles(body?.files)
    try {
      await query(
        `INSERT INTO learner_files (user_id, scope, files)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, scope)
         DO UPDATE SET files = EXCLUDED.files, updated_at = now()`,
        [user.id, scope, JSON.stringify(files)],
      )
    } catch (error) {
      if (missingTable(error)) return jsonError(503, 'Saving your files needs the latest database migration (npm run db:migrate).')
      throw error
    }
    return Response.json(files)
  })
}
