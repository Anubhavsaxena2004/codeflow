import { dummyPasswordHash, startSession, verifyPassword, type SessionUser } from '@/lib/server/auth'
import { jsonError, readBody } from '@/lib/server/api'
import { query } from '@/lib/server/db'

export async function POST(request: Request) {
  const body = await readBody(request)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email || !password || password.length > 128) return jsonError(400, 'Enter your email and password.')

  const [user] = await query<SessionUser & { password_hash: string }>(
    'SELECT id::text AS id, name, email, password_hash FROM users WHERE email = $1',
    [email],
  )
  const valid = await verifyPassword(password, user?.password_hash ?? (await dummyPasswordHash()))
  if (!user || !valid) return jsonError(401, 'Incorrect email or password.')

  await startSession(user.id)
  return Response.json({ user: { id: user.id, name: user.name, email: user.email } })
}
