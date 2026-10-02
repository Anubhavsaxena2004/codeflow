import { readFileSync } from 'node:fs'
import { Pool, type QueryResultRow } from 'pg'

declare global {
  // Reused across hot reloads in dev so each edit doesn't open a new pool.
  var codeflowPool: Pool | undefined
}

function createPool() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set. Add it to .env.local.')

  // node-postgres treats sslmode=require as verify-full, which fails against a provider CA
  // (Aiven) unless that CA is supplied, so TLS is configured explicitly instead.
  const url = new URL(process.env.DATABASE_URL)
  const sslmode = url.searchParams.get('sslmode')
  url.searchParams.delete('sslmode')
  const caPath = process.env.DATABASE_CA_CERT_PATH
  const ssl = caPath ? { ca: readFileSync(caPath, 'utf8') } : sslmode && sslmode !== 'disable' ? { rejectUnauthorized: false } : undefined

  return new Pool({
    connectionString: url.toString(),
    ssl,
    // The Aiven plan allows 20 connections in total; keep each server process well under that.
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  })
}

export function db() {
  globalThis.codeflowPool ??= createPool()
  return globalThis.codeflowPool
}

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  const result = await db().query<T>(text, params)
  return result.rows
}
