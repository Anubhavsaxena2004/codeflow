export const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'
export const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
export const GITHUB_API_BASE = 'https://api.github.com'

export interface GitHubConfig {
  clientId: string
  clientSecret: string
  /** Absolute URL GitHub redirects back to after OAuth. */
  redirectUri: string
  /** Passphrase used to derive the key that encrypts access tokens at rest. */
  tokenEncryptionKey: string
}

/**
 * The passphrase that encrypts access tokens at rest. Read on its own
 * (without the OAuth credentials) so token read/write works even while
 * GitHub OAuth is not configured yet and no request origin is available.
 */
export function getTokenEncryptionKey(): string {
  const { TOKEN_ENCRYPTION_KEY } = process.env
  if (!TOKEN_ENCRYPTION_KEY || TOKEN_ENCRYPTION_KEY.length < 16) {
    throw new Error('TOKEN_ENCRYPTION_KEY is required (16+ characters).')
  }
  return TOKEN_ENCRYPTION_KEY
}

/**
 * Reads the GitHub env vars. The redirect URI defaults to this app's
 * /api/github/callback (derived from the request origin) unless
 * GITHUB_REDIRECT_URI is set explicitly.
 */
export function getGitHubConfig(request?: Request): GitHubConfig {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_REDIRECT_URI } = process.env

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    throw new Error('GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are required.')
  }
  const tokenEncryptionKey = getTokenEncryptionKey()

  const redirectUri = GITHUB_REDIRECT_URI ?? (request ? `${new URL(request.url).origin}/api/github/callback` : '')
  if (!redirectUri) {
    throw new Error('Set GITHUB_REDIRECT_URI or serve the app so the request origin is known.')
  }

  return { clientId: GITHUB_CLIENT_ID, clientSecret: GITHUB_CLIENT_SECRET, redirectUri, tokenEncryptionKey }
}
