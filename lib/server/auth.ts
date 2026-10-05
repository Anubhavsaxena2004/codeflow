import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'
import { cookies } from 'next/headers'
import type { Track } from '@/lib/journeys/types'
import { query } from './db'

export interface SessionUser {
  id: string
  name: string
  email: string
  /** The tech stack the learner picked; null until they choose. */
  track: Track | null
  isAdmin: boolean
  /** Every level is open in any order (set by an admin); passing still counts the usual way. */
  allLevelsOpen: boolean
}

const adminEmails = () => (process.env.ADMIN_EMAILS ?? '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)

/** With ADMIN_EMAILS empty the admin is open to every signed-in user. Listing emails locks it to them. */
export function adminIsOpen() {
  return adminEmails().length === 0
}

/** Admins are listed by email in ADMIN_EMAILS (comma-separated), so granting access needs no UI or migration. */
export function isAdminEmail(email: string) {
  const admins = adminEmails()
  return admins.length === 0 || admins.includes(email.toLowerCase())
}

const SESSION_COOKIE = 'codeflow_session'
const SESSION_DAYS = 30

// ~32 MB and ~50–100 ms per hash. Parameters are stored in the hash so they can be raised later.
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, keylen: 64 }

function scryptKey(password: string, salt: Buffer, keylen: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize('NFKC'), salt, keylen, { ...options, maxmem: 64 * 1024 * 1024 }, (error, key) => (error ? reject(error) : resolve(key))),
  )
}

export async function hashPassword(password: string) {
  const { N, r, p, keylen } = SCRYPT
  const salt = randomBytes(16)
  const key = await scryptKey(password, salt, keylen, { N, r, p })
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, N, r, p, salt, key] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !key) return false
  const expected = Buffer.from(key, 'base64')
  const actual = await scryptKey(password, Buffer.from(salt, 'base64'), expected.length, { N: Number(N), r: Number(r), p: Number(p) })
  return timingSafeEqual(actual, expected)
}

// Verifying against this when an email is unknown keeps login timing the same, so it can't be used to probe for accounts.
let dummyHash: Promise<string> | undefined
export function dummyPasswordHash() {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'))
  return dummyHash
}

const hashToken = (token: string) => createHash('sha256').update(token).digest()

export async function startSession(userId: string) {
  const token = randomBytes(32).toString('base64url')
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)

  await query('DELETE FROM sessions WHERE user_id = $1 AND expires_at < now()', [userId])
  await query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [hashToken(token), userId, expires])

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  })
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null

  const [user] = await query<Omit<SessionUser, 'isAdmin'>>(
    `SELECT u.id::text AS id, u.name, u.email, u.track, u.all_levels_open AS "allLevelsOpen"
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  )
  return user ? { ...user, isAdmin: isAdminEmail(user.email) } : null
}

export async function endSession() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) await query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)])
  store.delete(SESSION_COOKIE)
}
