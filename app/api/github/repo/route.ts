import { jsonError, withUser } from '@/lib/server/api'
import { unlinkRepo } from '@/lib/github/store'

const JOURNEY_ID = /^[A-Za-z0-9_-]{1,128}$/

/**
 * Unlinks the repo for a journey without disconnecting GitHub, so the learner
 * can name a new repo or pick a different one on the next push.
 * Query: ?journeyId=
 */
export async function DELETE(request: Request) {
  return withUser(async (user) => {
    const journeyId = new URL(request.url).searchParams.get('journeyId') ?? ''
    if (!JOURNEY_ID.test(journeyId)) return jsonError(400, 'A valid journeyId is required.')
    await unlinkRepo(user.id, journeyId)
    return Response.json({ ok: true })
  })
}
