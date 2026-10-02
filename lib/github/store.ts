import { query } from '@/lib/server/db'
import { decryptSecret, encryptSecret } from './crypto'
import { getGitHubConfig } from './config'
import type { LinkedRepo, ProjectFile } from './types'

export interface DbConnection {
  githubUserId: string
  githubLogin: string
}

export async function getConnection(userId: string): Promise<DbConnection | null> {
  const [row] = await query<{ githubUserId: string; githubLogin: string }>(
    'SELECT github_user_id::text AS "githubUserId", github_login AS "githubLogin" FROM github_connections WHERE user_id = $1',
    [userId],
  )
  return row ? { githubUserId: row.githubUserId, githubLogin: row.githubLogin } : null
}

/** Decrypts the stored token; never exposed to the browser. */
export async function getAccessToken(userId: string): Promise<string | null> {
  const [row] = await query<{ token_enc: string }>('SELECT token_enc FROM github_connections WHERE user_id = $1', [userId])
  if (!row) return null
  return decryptSecret(row.token_enc, getGitHubConfig().tokenEncryptionKey)
}

/**
 * Connects or reconnects a GitHub account (last one wins).
 * The token is encrypted with a per-record salt before it touches the database.
 */
export async function upsertConnection(userId: string, githubUserId: string, githubLogin: string, accessToken: string): Promise<void> {
  const encrypted = encryptSecret(accessToken, getGitHubConfig().tokenEncryptionKey)
  await query(
    `INSERT INTO github_connections (user_id, github_user_id, github_login, token_enc)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE
       SET github_user_id = EXCLUDED.github_user_id,
           github_login = EXCLUDED.github_login,
           token_enc = EXCLUDED.token_enc,
           updated_at = now()`,
    [userId, githubUserId, githubLogin, encrypted],
  )
}

/** Disconnect: the stored token is deleted and can never be recovered. */
export async function deleteConnection(userId: string): Promise<void> {
  await query('DELETE FROM github_connections WHERE user_id = $1', [userId])
}

export async function getLinkedRepo(userId: string, journeyId: string): Promise<LinkedRepo | null> {
  const [row] = await query<{ owner: string; repo: string; branch: string; lastCommitSha: string | null }>(
    `SELECT owner, repo, branch, last_commit_sha AS "lastCommitSha"
       FROM github_repos
      WHERE user_id = $1 AND journey_id = $2`,
    [userId, journeyId],
  )
  return row ? { owner: row.owner, repo: row.repo, branch: row.branch, lastCommitSha: row.lastCommitSha } : null
}

export async function listLinkedRepos(userId: string): Promise<LinkedRepo[]> {
  const rows = await query<{ owner: string; repo: string; branch: string; lastCommitSha: string | null }>(
    `SELECT owner, repo, branch, last_commit_sha AS "lastCommitSha"
       FROM github_repos
      WHERE user_id = $1
      ORDER BY journey_id`,
    [userId],
  )
  return rows.map((row) => ({ owner: row.owner, repo: row.repo, branch: row.branch, lastCommitSha: row.lastCommitSha }))
}

export async function linkRepo(userId: string, journeyId: string, repo: Omit<LinkedRepo, 'lastCommitSha'>): Promise<void> {
  await query(
    `INSERT INTO github_repos (user_id, journey_id, owner, repo, branch)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, journey_id) DO UPDATE
       SET owner = EXCLUDED.owner,
           repo = EXCLUDED.repo,
           branch = EXCLUDED.branch,
           updated_at = now()`,
    [userId, journeyId, repo.owner, repo.repo, repo.branch],
  )
}

export async function setLastCommit(userId: string, journeyId: string, sha: string): Promise<void> {
  await query(
    'UPDATE github_repos SET last_commit_sha = $3, updated_at = now() WHERE user_id = $1 AND journey_id = $2',
    [userId, journeyId, sha],
  )
}

/** The learner's saved project files — the source of every push. */
export async function listProjectFiles(userId: string, journeyId: string): Promise<ProjectFile[]> {
  const rows = await query<{ path: string; content: string }>(
    'SELECT path, content FROM user_project_files WHERE user_id = $1 AND journey_id = $2 ORDER BY path',
    [userId, journeyId],
  )
  return rows
}

export async function saveOAuthState(state: string, userId: string): Promise<void> {
  await query('DELETE FROM github_oauth_states WHERE expires_at < now()')
  await query(
    "INSERT INTO github_oauth_states (state, user_id, expires_at) VALUES ($1, $2, now() + interval '10 minutes')",
    [state, userId],
  )
}

/**
 * Consumes an OAuth state (single use, 10-minute expiry).
 * Returns the userId it was issued to, or null when unknown/expired.
 */
export async function consumeOAuthState(state: string): Promise<string | null> {
  const [row] = await query<{ userId: string }>(
    `DELETE FROM github_oauth_states
      WHERE state = $1 AND expires_at > now()
      RETURNING user_id::text AS "userId"`,
    [state],
  )
  return row?.userId ?? null
}
