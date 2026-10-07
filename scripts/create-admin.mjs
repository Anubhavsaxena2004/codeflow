// Creates the admin account, or resets its password if it already exists.
// Usage: npm run admin:create -- <email> <password> [name]
// Reads DATABASE_URL from the environment or .env.local. The password is hashed exactly like
// lib/server/auth.ts does it, and is never stored or printed in plain text.

import { randomBytes, scrypt } from 'node:crypto'
import { readFileSync } from 'node:fs'
import pg from 'pg'

try {
  process.loadEnvFile('.env.local')
} catch {
  // No .env.local: rely on the real environment
}

const [rawEmail, password, name = 'Admin'] = process.argv.slice(2)
const email = (rawEmail ?? '').trim().toLowerCase()
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
  console.error('Usage: npm run admin:create -- <email> <password> [name]')
  process.exit(1)
}
if (password.length < 8 || password.length > 128) {
  console.error('The password must be 8–128 characters.')
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to .env.local.')
  process.exit(1)
}

// Same parameters and format as lib/server/auth.ts → hashPassword.
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, keylen: 64 }
const salt = randomBytes(16)
const key = await new Promise((resolve, reject) =>
  scrypt(password.normalize('NFKC'), salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 64 * 1024 * 1024 }, (error, derived) =>
    error ? reject(error) : resolve(derived),
  ),
)
const passwordHash = `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`

// Same TLS handling as lib/server/db.ts
const url = new URL(process.env.DATABASE_URL)
const sslmode = url.searchParams.get('sslmode')
url.searchParams.delete('sslmode')
const caPath = process.env.DATABASE_CA_CERT_PATH
const ssl = caPath ? { ca: readFileSync(caPath, 'utf8') } : sslmode && sslmode !== 'disable' ? { rejectUnauthorized: false } : undefined

const client = new pg.Client({ connectionString: url.toString(), ssl })
await client.connect()
try {
  const { rows } = await client.query(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id, (xmax = 0) AS created`,
    [name, email, passwordHash],
  )
  // A new password signs out every old session of this account.
  if (!rows[0].created) await client.query('DELETE FROM sessions WHERE user_id = $1', [rows[0].id])
  console.log(`${rows[0].created ? 'Created' : 'Updated the password of'} ${email}.`)
  console.log('It is an admin when it is the owner email in lib/server/auth.ts or listed in ADMIN_EMAILS.')
} finally {
  await client.end()
}
