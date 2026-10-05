import { getChallenge, solutionOrder, type Challenge } from '@/data/challenges'
import { getCurrentUser, type SessionUser } from './auth'

export function jsonError(status: number, error: string) {
  return Response.json({ error }, { status })
}

/** Parses a JSON object body, or returns null for anything else (bad JSON, arrays, primitives). */
export async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json()
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export function isInt(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max
}

/** Runs the handler with the signed-in user, or answers 401. */
export async function withUser(handler: (user: SessionUser) => Promise<Response>) {
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Sign in to save progress.')
  return handler(user)
}

/**
 * For routes every visitor needs (sign-in, sign-up): an unreachable database becomes a clear 503
 * instead of a bare 500, and the real error goes to the server log (Vercel → Logs).
 */
export async function withDatabase(action: string, handler: () => Promise<Response>) {
  try {
    return await handler()
  } catch (error) {
    console.error(`${action} failed:`, error)
    return jsonError(503, `${action} is unavailable right now because the server could not reach the database. Try again in a minute.`)
  }
}

/** Runs the handler for an admin (see ADMIN_EMAILS), or answers 401/403. */
export async function withAdmin(handler: (user: SessionUser) => Promise<Response>) {
  return withUser((user) => (user.isAdmin ? handler(user) : Promise.resolve(jsonError(403, 'Admins only.'))))
}

export type ChallengeRouteContext = { params: Promise<{ id: string }> }

/** Resolves the `[id]` route param to a challenge and the signed-in user, or answers 404/401. */
export async function withChallenge(context: ChallengeRouteContext, handler: (challenge: Challenge, user: SessionUser) => Promise<Response>) {
  const challenge = getChallenge((await context.params).id)
  if (!challenge) return jsonError(404, 'Unknown challenge.')
  return withUser((user) => handler(challenge, user))
}

/** One entry per step: a known block id or null for an empty step, with no block used twice. */
export function parseSlots(value: unknown, challenge: Challenge): (string | null)[] | null {
  if (!Array.isArray(value) || value.length !== solutionOrder(challenge).length) return null
  const known = new Set(challenge.blocks.map((block) => block.id))
  const placed = value.filter((slot) => slot !== null)
  const valid = placed.every((slot) => typeof slot === 'string' && known.has(slot)) && new Set(placed).size === placed.length
  return valid ? (value as (string | null)[]) : null
}
