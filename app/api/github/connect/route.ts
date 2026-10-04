import { randomBytes } from 'node:crypto'
import { jsonError, readBody, withUser } from '@/lib/server/api'
import { GITHUB_AUTHORIZE_URL, getGitHubConfig } from '@/lib/github/config'
import { encodeOAuthState } from '@/lib/github/oauth-state'
import { saveOAuthState } from '@/lib/github/store'

/**
 * Starts GitHub OAuth. The state is stored server-side and bound to this user;
 * the return path is folded into the state so the callback can bring the
 * learner back to the page they started from.
 * Body: { returnTo? } — a same-origin path like "/challenge/signup".
 */
export async function POST(request: Request) {
  return withUser(async (user) => {
    let config
    try {
      config = getGitHubConfig(request)
    } catch (error) {
      return jsonError(500, error instanceof Error ? error.message : 'GitHub is not configured.')
    }

    const body = await readBody(request)
    const state = encodeOAuthState(randomBytes(16).toString('hex'), body?.returnTo)
    await saveOAuthState(state, user.id)

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: 'repo',
      state,
    })

    return Response.json({ url: `${GITHUB_AUTHORIZE_URL}?${params}` })
  })
}
