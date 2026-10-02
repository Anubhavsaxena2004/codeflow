import { randomBytes } from 'node:crypto'
import { jsonError, withUser } from '@/lib/server/api'
import { GITHUB_AUTHORIZE_URL, getGitHubConfig } from '@/lib/github/config'
import { saveOAuthState } from '@/lib/github/store'

/** Starts GitHub OAuth. The state is stored server-side and bound to this user. */
export async function POST(request: Request) {
  return withUser(async (user) => {
    let config
    try {
      config = getGitHubConfig(request)
    } catch (error) {
      return jsonError(500, error instanceof Error ? error.message : 'GitHub is not configured.')
    }

    const state = randomBytes(16).toString('hex')
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
