import { GITHUB_API_BASE } from './config'

// A learner can connect GitHub with a personal access token instead of the OAuth app. It is
// stored exactly like an OAuth token (encrypted, one per user), so pushes work the same way and
// CodeFlow needs no GitHub app at all.

/** Where to create a classic token with the repo scope already ticked. */
export const NEW_TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=repo&description=CodeFlow'

const CLASSIC = /^ghp_[A-Za-z0-9]{30,251}$/
const FINE_GRAINED = /^github_pat_[A-Za-z0-9_]{22,244}$/

export type TokenCheck =
  | { ok: true; login: string; githubUserId: string; kind: 'classic' | 'fine-grained' }
  | { ok: false; status: number; message: string }

/**
 * Asks GitHub who the token belongs to. A classic token must carry the repo scope, which pushes
 * and private repositories need. Fine-grained tokens don't report their permissions, so they are
 * accepted here and a missing permission surfaces on the first push.
 */
export async function checkPersonalToken(token: string, fetchImpl: typeof fetch = fetch): Promise<TokenCheck> {
  const kind = CLASSIC.test(token) ? 'classic' : FINE_GRAINED.test(token) ? 'fine-grained' : null
  if (!kind) {
    return { ok: false, status: 400, message: 'That is not a GitHub personal access token. Classic tokens start with ghp_, fine-grained ones with github_pat_.' }
  }

  let response: Response
  try {
    response = await fetchImpl(`${GITHUB_API_BASE}/user`, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' },
    })
  } catch {
    return { ok: false, status: 502, message: 'Could not reach GitHub. Try again in a minute.' }
  }
  if (response.status === 401) return { ok: false, status: 400, message: 'GitHub rejected this token. It may be mistyped, expired or deleted.' }
  if (!response.ok) return { ok: false, status: 502, message: `GitHub answered ${response.status}. Try again in a minute.` }

  if (kind === 'classic') {
    const scopes = (response.headers.get('x-oauth-scopes') ?? '').split(',').map((scope) => scope.trim())
    if (!scopes.includes('repo')) {
      return { ok: false, status: 400, message: 'This token is missing the "repo" scope, so it cannot create or push to your repositories. Make a new one with repo ticked.' }
    }
  }

  const user = (await response.json().catch(() => ({}))) as { id?: number; login?: string }
  if (typeof user.id !== 'number' || typeof user.login !== 'string') return { ok: false, status: 502, message: 'GitHub sent an unexpected answer. Try again.' }
  return { ok: true, login: user.login, githubUserId: String(user.id), kind }
}
