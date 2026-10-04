import { jsonError, readBody, withUser } from '@/lib/server/api'
import { getChallenge } from '@/data/challenges'
import { createGitHubClient } from '@/lib/github/client'
import { challengeMessage, defaultFileMessage } from '@/lib/github/messages'
import { singleFilePush } from '@/lib/github/push'
import { resolveTargetRepo } from '@/lib/github/repo'
import { getAccessToken, getConnection, listProjectFiles, setLastCommit } from '@/lib/github/store'
import { isExcludedPath, isValidPath } from '@/lib/github/filter'

const JOURNEY_ID = /^[A-Za-z0-9_-]{1,128}$/

/**
 * SINGLE-FILE PUSH: updates one project file via the Contents API.
 * Body: { journeyId, path, message?, challengeId?, challengeTitle?, repoName?, existingRepo? }
 * Result: { ok, commitSha, pushedFiles, conflict?, ... }
 */
export async function PUT(request: Request) {
  return withUser(async (user) => {
    const body = await readBody(request)
    const journeyId = typeof body?.journeyId === 'string' ? body.journeyId : ''
    const path = typeof body?.path === 'string' ? body.path : ''
    if (!JOURNEY_ID.test(journeyId)) return jsonError(400, 'A valid journeyId is required.')
    if (!isValidPath(path) || isExcludedPath(path)) return jsonError(400, 'Enter a valid project file path.')

    const connection = await getConnection(user.id)
    const accessToken = connection && (await getAccessToken(user.id))
    if (!connection || !accessToken) return jsonError(409, 'Connect GitHub before pushing.')

    const files = await listProjectFiles(user.id, journeyId)
    const file = files.find((entry) => entry.path === path)
    if (!file) return jsonError(404, 'That file is not part of your saved project.')

    const challengeId = typeof body?.challengeId === 'string' ? body.challengeId : undefined
    const challengeTitle =
      typeof body?.challengeTitle === 'string' && body.challengeTitle.trim()
        ? body.challengeTitle.trim()
        : challengeId
          ? getChallenge(challengeId)?.title
          : undefined
    const message =
      typeof body?.message === 'string' && body.message.trim()
        ? body.message.trim()
        : challengeTitle
          ? challengeMessage(path, challengeTitle)
          : defaultFileMessage(path)

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

      const result = await singleFilePush({
        client,
        owner: resolution.repo.owner,
        repo: resolution.repo.repo,
        branch: resolution.repo.branch,
        files: [file],
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
