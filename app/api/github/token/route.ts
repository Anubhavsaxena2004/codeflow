import { jsonError, readBody, withUser } from '@/lib/server/api'
import { upsertConnection } from '@/lib/github/store'
import { checkPersonalToken } from '@/lib/github/token'

/**
 * Connects GitHub with a personal access token, for learners (or whole deployments) without the
 * OAuth app. The token is checked with GitHub, then stored encrypted like an OAuth token.
 * Body: { token }
 */
export async function POST(request: Request) {
  return withUser(async (user) => {
    const body = await readBody(request)
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    if (!token) return jsonError(400, 'Paste your token first.')

    const checked = await checkPersonalToken(token)
    if (!checked.ok) return jsonError(checked.status, checked.message)

    try {
      await upsertConnection(user.id, checked.githubUserId, checked.login, token)
    } catch (error) {
      console.error('Saving a GitHub token failed:', error)
      return jsonError(500, error instanceof Error && error.message.includes('TOKEN_ENCRYPTION_KEY') ? 'The server has no TOKEN_ENCRYPTION_KEY yet, so it cannot store tokens safely. Ask an admin to set it.' : 'Could not save the token. Try again.')
    }
    return Response.json({ ok: true, login: checked.login, kind: checked.kind })
  })
}
