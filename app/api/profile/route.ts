import { isTrack } from '@/lib/journeys/types'
import { jsonError, readBody, withUser } from '@/lib/server/api'
import { query } from '@/lib/server/db'

/**
 * Sets the learner's tech stack or chosen developer avatar.
 */
export async function PUT(request: Request) {
  return withUser(async (user) => {
    const body = await readBody(request)

    // Avatar update
    if (body?.avatar !== undefined) {
      const avatar = typeof body.avatar === 'string' && body.avatar.trim() ? body.avatar.trim().slice(0, 40) : 'mascot-green'
      await query('UPDATE users SET avatar = $2 WHERE id = $1', [user.id, avatar])
      user.avatar = avatar
    }

    // Track update
    if (body?.track !== undefined) {
      if (!isTrack(body.track)) return jsonError(400, 'track must be mern, django or spring.')
      if (user.track && user.track !== body.track && !user.isAdmin) {
        return jsonError(403, 'Your tech stack is already chosen. Ask an admin to change it.')
      }
      // The WHERE clause closes the race of two first picks arriving at once.
      const [row] = await query<{ track: string }>(
        'UPDATE users SET track = $2 WHERE id = $1 AND (track IS NULL OR track = $2 OR $3) RETURNING track',
        [user.id, body.track, user.isAdmin],
      )
      if (!row) return jsonError(403, 'Your tech stack is already chosen. Ask an admin to change it.')
      user.track = body.track
    }

    if (body?.avatar === undefined && body?.track === undefined) {
      return jsonError(400, 'Provide track or avatar to update.')
    }

    return Response.json({ user })
  })
}
