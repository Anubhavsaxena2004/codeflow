import { hashPassword, isAdminEmail, startSession } from '@/lib/server/auth'
import { jsonError, readBody, withDatabase } from '@/lib/server/api'
import { query } from '@/lib/server/db'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const body = await readBody(request)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!name || name.length > 80) return jsonError(400, 'Enter a name (up to 80 characters).')
  if (email.length > 254 || !EMAIL.test(email)) return jsonError(400, 'Enter a valid email address.')
  if (password.length < 8 || password.length > 128) return jsonError(400, 'Password must be 8–128 characters.')
  // Emails are not verified, so an admin address must never be claimable by signing up.
  // The admin account is created with `npm run admin:create` instead.
  if (isAdminEmail(email)) return jsonError(403, 'This email address is reserved. Sign in instead.')

  return withDatabase('Sign-up', async () => {
    // Same order the signup challenge teaches: rule out a duplicate before paying for the hash.
    const [existing] = await query('SELECT 1 FROM users WHERE email = $1', [email])
    if (existing) return jsonError(409, 'An account with this email already exists. Sign in instead.')

    const passwordHash = await hashPassword(password)
    // ON CONFLICT covers two signups for the same email racing past the check above.
    const [user] = await query<{ id: string }>(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id::text AS id',
      [name, email, passwordHash],
    )
    if (!user) return jsonError(409, 'An account with this email already exists. Sign in instead.')

    await startSession(user.id)
    return Response.json({ user: { id: user.id, name, email } }, { status: 201 })
  })
}
