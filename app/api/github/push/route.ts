import { jsonError, readBody, withUser } from '@/lib/server/api'
import { createGitHubClient } from '@/lib/github/client'
import { defaultBulkMessage, stageMessage } from '@/lib/github/messages'
import { bulkPush } from '@/lib/github/push'
import { resolveTargetRepo } from '@/lib/github/repo'
import { getAccessToken, getConnection, listProjectFiles, setLastCommit } from '@/lib/github/store'

const JOURNEY_ID = /^[A-Za-z0-9_-]{1,128}$/

/**
 * BULK PUSH: pushes the entire project for (user, journey) as ONE commit.
 * Body: { journeyId, message?, stageName?, repoName?, existingRepo? }
 * Result: { ok, commitSha, pushedFiles, conflict?, ... }
 */
export async function POST(request: Request) {
  return withUser(async (user) => {
    const body = await readBody(request)
    const journeyId = typeof body?.journeyId === 'string' ? body.journeyId : ''
    if (!JOURNEY_ID.test(journeyId)) return jsonError(400, 'A valid journeyId is required.')

    const connection = await getConnection(user.id)
    const accessToken = connection && (await getAccessToken(user.id))
    if (!connection || !accessToken) return jsonError(409, 'Connect GitHub before pushing.')

    const files = await listProjectFiles(user.id, journeyId)
    if (files.length === 0) return jsonError(404, 'No project files saved for this journey yet.')

    const stageName = typeof body?.stageName === 'string' ? body.stageName.trim() : ''
    const message =
      typeof body?.message === 'string' && body.message.trim()
        ? body.message.trim()
        : stageName
          ? stageMessage(stageName)
          : defaultBulkMessage()

    try {
      const client = createGitHubClient({ token: accessToken })
      const resolution = await resolveTargetRepo({
        userId: user.id,
        journeyId,
        client,
        login: connection.githubLogin,
        existingRepo: typeof body?.existingRepo === 'string' ? body.existingRepo.trim() : undefined,
        repoName: typeof body?.repoName === 'string' ? body.repoName.trim() : undefined,
      })
      if (!resolution.ok) return jsonError(resolution.error === 'invalid_name' ? 400 : 409, resolution.message)

      const result = await bulkPush({
        client,
        owner: resolution.repo.owner,
        repo: resolution.repo.repo,
        branch: resolution.repo.branch,
        files,
        message,
        expectedHeadSha: resolution.repo.lastCommitSha,
      })
      if (result.ok) await setLastCommit(user.id, journeyId, result.commitSha)
      return Response.json(result)
    } catch (error) {
      return jsonError(500, error instanceof Error ? error.message : 'Push failed.')
    }
  })
}
