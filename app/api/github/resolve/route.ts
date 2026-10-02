import { jsonError, readBody, withUser } from '@/lib/server/api'
import { createGitHubClient } from '@/lib/github/client'
import { getAccessToken, getConnection, getLinkedRepo, setLastCommit } from '@/lib/github/store'

const JOURNEY_ID = /^[A-Za-z0-9_-]{1,128}$/

/**
 * Conflict resolution: the user reviewed the diff on GitHub and accepts
 * the remote branch as the new base. The next push layers the saved
 * project files on top of it (files only on GitHub are kept; files in
 * the project are updated to the saved version).
 * Body: { journeyId }
 */
export async function POST(request: Request) {
  return withUser(async (user) => {
    const body = await readBody(request)
    const journeyId = typeof body?.journeyId === 'string' ? body.journeyId : ''
    if (!JOURNEY_ID.test(journeyId)) return jsonError(400, 'A valid journeyId is required.')

    const connection = await getConnection(user.id)
    const accessToken = connection && (await getAccessToken(user.id))
    if (!connection || !accessToken) return jsonError(409, 'Connect GitHub before pushing.')

    const linked = await getLinkedRepo(user.id, journeyId)
    if (!linked) return jsonError(404, 'No repository linked for this journey yet.')

    try {
      const client = createGitHubClient({ token: accessToken })
      const ref = await client.get<{ object: { sha: string } }>(
        `/repos/${linked.owner}/${linked.repo}/git/ref/heads/${linked.branch}`,
      )
      await setLastCommit(user.id, journeyId, ref.object.sha)
      return Response.json({ ok: true, remoteSha: ref.object.sha, branch: linked.branch })
    } catch (error) {
      return jsonError(500, error instanceof Error ? error.message : 'Resolve failed.')
    }
  })
}
