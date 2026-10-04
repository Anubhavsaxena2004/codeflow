import { GITHUB_API_BASE, GITHUB_TOKEN_URL } from './config'

export class GitHubError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'GitHubError'
    this.status = status
    this.body = body
  }
}

export class NotFoundError extends GitHubError {
  constructor(message: string, body?: unknown) {
    super(message, 404, body)
    this.name = 'NotFoundError'
  }
}

export class AuthError extends GitHubError {
  constructor(message: string, body?: unknown) {
    super(message, 401, body)
    this.name = 'AuthError'
  }
}

/** 409/422 — e.g. a non-fast-forward ref update we must not force. */
export class ConflictError extends GitHubError {
  constructor(message: string, status: number, body?: unknown) {
    super(message, status, body)
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends GitHubError {
  readonly remaining: number
  readonly resetAt: Date | null

  constructor(message: string, remaining: number, resetAt: Date | null) {
    super(message, 403)
    this.name = 'RateLimitError'
    this.remaining = remaining
    this.resetAt = resetAt
  }
}

export interface GitHubClientOptions {
  token: string
  /** Injectable so tests can mock GitHub without any network. */
  fetchImpl?: typeof fetch
  baseUrl?: string
  /** Refuse new requests once the hourly budget drops to this many calls. */
  minRemaining?: number
}

export interface GitHubClient {
  get<T>(path: string): Promise<T>
  post<T>(path: string, body?: unknown): Promise<T>
  put<T>(path: string, body: unknown): Promise<T>
  patch<T>(path: string, body: unknown): Promise<T>
  delete<T>(path: string): Promise<T>
}

interface GitHubErrorBody {
  message?: string
  errors?: Array<{ message?: string }>
}

function secondsToDate(seconds: string | null): Date | null {
  if (!seconds) return null
  const ms = Number(seconds) * 1000
  return Number.isFinite(ms) ? new Date(ms) : null
}

export function createGitHubClient(options: GitHubClientOptions): GitHubClient {
  const fetchImpl = options.fetchImpl ?? fetch
  const baseUrl = (options.baseUrl ?? GITHUB_API_BASE).replace(/\/+$/, '')
  const minRemaining = options.minRemaining ?? 0

  async function request<T>(method: string, path: string, body?: unknown, attempt = 0): Promise<T> {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${options.token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })

    const remainingHeader = response.headers.get('x-ratelimit-remaining')
    const remaining = remainingHeader === null ? Number.NaN : Number(remainingHeader)
    const resetAt = secondsToDate(response.headers.get('x-ratelimit-reset'))
    // Respect the hourly budget: stop before GitHub starts rejecting calls.
    if (Number.isFinite(remaining) && remaining <= minRemaining) {
      throw new RateLimitError(
        remaining <= 0
          ? `GitHub API rate limit exhausted; resets at ${resetAt?.toISOString() ?? 'unknown'}.`
          : `GitHub API rate limit nearly exhausted (${remaining} calls left); resets at ${resetAt?.toISOString() ?? 'unknown'}.`,
        remaining,
        resetAt,
      )
    }

    if (!response.ok) {
      const text = await response.text()
      let parsed: GitHubErrorBody | undefined
      try {
        parsed = JSON.parse(text)
      } catch {
        // Non-JSON error body; fall back to the status text below.
      }
      const detail = parsed?.errors?.map((e) => e.message).filter(Boolean).join('; ') ?? parsed?.message ?? response.statusText
      const message = `${method} ${path} failed: ${detail}`

      if (response.status === 404) throw new NotFoundError(message, parsed)
      if (response.status === 401) throw new AuthError(message, parsed)
      if (response.status === 409 || response.status === 422) throw new ConflictError(message, response.status, parsed)
      if (response.status === 403 && Number.isFinite(remaining) && remaining <= 0) {
        throw new RateLimitError(message, remaining, resetAt)
      }
      if ((response.status === 502 || response.status === 503 || response.status === 504) && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return request<T>(method, path, body, attempt + 1)
      }
      throw new GitHubError(message, response.status, parsed)
    }

    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body ?? {}, 0),
    put: (path, body) => request('PUT', path, body, 0),
    patch: (path, body) => request('PATCH', path, body, 0),
    delete: (path) => request('DELETE', path),
  }
}

export type OAuthExchangeResult =
  | { ok: true; accessToken: string; tokenType: string; scope: string }
  | { ok: false; error: string; description?: string }

/**
 * Exchanges the OAuth `code` from the callback for an access token.
 * This talks to github.com (not the API base) and is server-side only.
 */
export async function exchangeOAuthCode(options: {
  clientId: string
  clientSecret: string
  code: string
  redirectUri: string
  fetchImpl?: typeof fetch
}): Promise<OAuthExchangeResult> {
  const params = new URLSearchParams({
    client_id: options.clientId,
    client_secret: options.clientSecret,
    code: options.code,
    redirect_uri: options.redirectUri,
  })
  const response = await (options.fetchImpl ?? fetch)(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  const data = (await response.json().catch(() => ({}))) as {
    access_token?: string
    token_type?: string
    scope?: string
    error?: string
    error_description?: string
  }
  if (typeof data.access_token === 'string') {
    return { ok: true, accessToken: data.access_token, tokenType: data.token_type ?? 'bearer', scope: data.scope ?? '' }
  }
  return { ok: false, error: data.error ?? 'oauth_exchange_failed', description: data.error_description }
}
