import { createGitHubClient, exchangeOAuthCode } from '@/lib/github/client'
import { getGitHubConfig } from '@/lib/github/config'
import { returnToFromState } from '@/lib/github/oauth-state'
import { consumeOAuthState, upsertConnection } from '@/lib/github/store'

/** Finishes GitHub OAuth. Redirects the browser back to the app with ?github=connected|error. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const returnTo = state ? returnToFromState(state) : '/'
  const separator = returnTo.includes('?') ? '&' : '?'
  const back = (query: string) => Response.redirect(`${origin}${returnTo}${separator}${query}`, 303)
  const fail = (reason: string) => back(`github=error&reason=${encodeURIComponent(reason)}`)

  if (error) return fail(error)
  if (!code || !state) return fail('missing_params')

  // Single-use, 10-minute state bound to the signed-in user (CSRF protection).
  const userId = await consumeOAuthState(state)
  if (!userId) return fail('invalid_state')

  const config = getGitHubConfig(request)
  const exchanged = await exchangeOAuthCode({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    code,
    redirectUri: config.redirectUri,
  })
  if (!exchanged.ok) return fail(exchanged.error)

  let login: string
  let githubUserId: string
  try {
    const me = await createGitHubClient({ token: exchanged.accessToken }).get<{ id: number; login: string }>('/user')
    login = me.login
    githubUserId = String(me.id)
  } catch {
    return fail('github_unreachable')
  }

  // Upsert: covers both the first connect and reconnecting (also with another account).
  await upsertConnection(userId, githubUserId, login, exchanged.accessToken)
  return back('github=connected')
}
