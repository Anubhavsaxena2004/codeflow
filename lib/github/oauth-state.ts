const DEFAULT_RETURN_TO = '/'
const MAX_RETURN_TO = 200

/** Accepts only a same-origin path; anything else falls back to the home page. */
export function safeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_RETURN_TO) return DEFAULT_RETURN_TO
  if (!value.startsWith('/') || value.startsWith('//')) return DEFAULT_RETURN_TO
  if (value.includes('\\') || /[\r\n]/.test(value)) return DEFAULT_RETURN_TO
  return value
}

/**
 * Folds the return path into the OAuth state as `<nonce>.<base64url(path)>`.
 * The nonce is what's stored server-side, so the state stays single-use.
 */
export function encodeOAuthState(nonce: string, value: unknown): string {
  const returnTo = safeReturnTo(value)
  return returnTo === DEFAULT_RETURN_TO ? nonce : `${nonce}.${Buffer.from(returnTo).toString('base64url')}`
}

/** Recovers the return path from a state produced by encodeOAuthState. */
export function returnToFromState(state: string): string {
  const dot = state.indexOf('.')
  if (dot < 0) return DEFAULT_RETURN_TO
  try {
    return safeReturnTo(Buffer.from(state.slice(dot + 1), 'base64url').toString('utf8'))
  } catch {
    return DEFAULT_RETURN_TO
  }
}
