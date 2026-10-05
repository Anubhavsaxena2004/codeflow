import { jsonError, readBody, withAdmin } from '@/lib/server/api'
import { query } from '@/lib/server/db'

type Context = { params: Promise<{ id: string }> }

/** Opens (or closes again) every level for one learner. Body: { allLevelsOpen } */
export async function PATCH(request: Request, context: Context) {
  return withAdmin(async () => {
    const { id } = await context.params
    const body = await readBody(request)
    if (!/^\d{1,18}$/.test(id) || typeof body?.allLevelsOpen !== 'boolean') return jsonError(400, 'Send { allLevelsOpen: true | false } for a learner id.')

    const [user] = await query<{ id: string }>('UPDATE users SET all_levels_open = $2 WHERE id = $1 RETURNING id::text AS id', [id, body.allLevelsOpen])
    if (!user) return jsonError(404, 'No learner with that id.')
    return Response.json({ ok: true, allLevelsOpen: body.allLevelsOpen })
  })
}
