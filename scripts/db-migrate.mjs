// Applies db/migrations/*.sql in name order, each once, each in its own transaction.
// Usage: npm run db:migrate   (reads DATABASE_URL from the environment or .env.local)

import { readFileSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

try {
  process.loadEnvFile('.env.local')
} catch {
  // No .env.local: rely on the real environment (CI, hosting provider)
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to .env.local.')
  process.exit(1)
}

// Same TLS handling as lib/server/db.ts
const url = new URL(process.env.DATABASE_URL)
const sslmode = url.searchParams.get('sslmode')
url.searchParams.delete('sslmode')
const caPath = process.env.DATABASE_CA_CERT_PATH
const ssl = caPath ? { ca: readFileSync(caPath, 'utf8') } : sslmode && sslmode !== 'disable' ? { rejectUnauthorized: false } : undefined

const client = new pg.Client({ connectionString: url.toString(), ssl })
const dir = path.join(process.cwd(), 'db', 'migrations')

await client.connect()
try {
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())')
  const { rows } = await client.query('SELECT name FROM schema_migrations')
  const applied = new Set(rows.map((row) => row.name))
  const pending = (await readdir(dir)).filter((file) => file.endsWith('.sql') && !applied.has(file)).sort()

  for (const file of pending) {
    await client.query('BEGIN')
    try {
      await client.query(await readFile(path.join(dir, file), 'utf8'))
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
      await client.query('COMMIT')
      console.log(`applied ${file}`)
    } catch (error) {
      await client.query('ROLLBACK')
      throw new Error(`${file} failed: ${error.message}`)
    }
  }

  if (pending.length === 0) console.log('Database is up to date.')
} finally {
  await client.end()
}
