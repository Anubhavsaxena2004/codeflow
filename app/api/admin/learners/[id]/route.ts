import { isTrack } from '@/lib/journeys/types'
import { jsonError, readBody, withAdmin } from '@/lib/server/api'
import { query } from '@/lib/server/db'

type Context = { params: Promise<{ id: string }> }

/**
 * Changes one learner. Body: { allLevelsOpen } opens (or closes again) every level for them;
 * { track } sets their tech stack, which learners can only pick once themselves.
 */
export async function PATCH(request: Request, context: Context) {
  return withAdmin(async () => {
    const { id } = await context.params
    const body = await readBody(request)
    const allLevelsOpen = body?.allLevelsOpen
    const track = body?.track
    const valid = /^\d{1,18}$/.test(id) && (typeof allLevelsOpen === 'boolean' || isTrack(track))
    if (!valid) return jsonError(400, 'Send { allLevelsOpen: true | false } or { track: "mern" | "django" | "spring" } for a learner id.')

    const [user] = await query<{ id: string; allLevelsOpen: boolean; track: string | null }>(
      `UPDATE users
          SET all_levels_open = COALESCE($2, all_levels_open),
              track           = COALESCE($3, track)
        WHERE id = $1
        RETURNING id::text AS id, all_levels_open AS "allLevelsOpen", track`,
      [id, typeof allLevelsOpen === 'boolean' ? allLevelsOpen : null, isTrack(track) ? track : null],
    )
    if (!user) return jsonError(404, 'No learner with that id.')
    return Response.json({ ok: true, allLevelsOpen: user.allLevelsOpen, track: user.track })
  })
}
