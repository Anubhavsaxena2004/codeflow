import { isTrack } from '@/lib/journeys/types'
import { jsonError, readBody, withUser } from '@/lib/server/api'
import { query } from '@/lib/server/db'

/** Sets the learner's tech stack, which decides the journeys on their home page. */
export async function PUT(request: Request) {
  return withUser(async (user) => {
    const body = await readBody(request)
    if (!isTrack(body?.track)) return jsonError(400, 'track must be mern, django or spring.')
    await query('UPDATE users SET track = $2 WHERE id = $1', [user.id, body.track])
    return Response.json({ user: { ...user, track: body.track } })
  })
}
