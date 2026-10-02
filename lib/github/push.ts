import type { GitHubClient } from './client'
import { AuthError, GitHubError, NotFoundError, RateLimitError } from './client'
import { filterFiles, isValidPath, scanForSecrets } from './filter'
import { buildTreeEntries, createTreePayload, toBase64 } from './tree'
import type { ProjectFile, PushResult, SecretFinding } from './types'

export interface PushInput {
  client: GitHubClient
  owner: string
  repo: string
  branch: string
  files: ProjectFile[]
  message: string
  /** Sha of our last push. A different remote sha means the user edited on GitHub. */
  expectedHeadSha: string | null
}

interface RepoCheckOk {
  ok: true
}

type RepoCheck = RepoCheckOk | PushResult

interface HeadInfo {
  sha: string
  treeSha: string | null
}

interface PreparedFiles {
  ok: true
  included: ProjectFile[]
  excluded: string[]
}

/** prepareFiles never returns a conflict, so failures stay discriminable from success. */
type Prepared = PreparedFiles | Extract<PushResult, { ok: false }>

/** Small bounded concurrency so a large project doesn't open hundreds of sockets. */
const BLOB_CONCURRENCY = 5

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

/** Verifies the repo exists and the connected user can push to it. */
async function checkRepository(client: GitHubClient, owner: string, repo: string): Promise<RepoCheck> {
  let repository: { permissions?: { push?: boolean } }
  try {
    repository = await client.get(`/repos/${owner}/${repo}`)
  } catch (error) {
    if (error instanceof NotFoundError) {
      return {
        ok: false,
        conflict: false,
        error: 'repo_missing',
        message: `Repository ${owner}/${repo} was not found. Re-link your repository and try again.`,
      }
    }
    throw error
  }
  if (repository.permissions?.push !== true) {
    return {
      ok: false,
      conflict: false,
      error: 'no_push_access',
      message: `You don't have push access to ${owner}/${repo}. Choose a repository you own.`,
    }
  }
  return { ok: true }
}

/** HEAD sha + its tree sha; null when the branch doesn't exist yet (empty repo). */
async function resolveHead(client: GitHubClient, owner: string, repo: string, branch: string): Promise<HeadInfo | null> {
  try {
    const ref = await client.get<{ object: { sha: string } }>(`/repos/${owner}/${repo}/git/ref/heads/${branch}`)
    try {
      const commit = await client.get<{ tree: { sha: string } }>(`/repos/${owner}/${repo}/git/commits/${ref.object.sha}`)
      return { sha: ref.object.sha, treeSha: commit.tree.sha }
    } catch {
      // Commit unreadable (unusual); push without a base_tree.
      return { sha: ref.object.sha, treeSha: null }
    }
  } catch (error) {
    if (error instanceof NotFoundError) return null
    throw error
  }
}

/** Remote HEAD must match our last-pushed sha, otherwise the user edited on GitHub. */
function checkConflict(head: HeadInfo | null, expectedHeadSha: string | null, branch: string): PushResult | null {
  if (!expectedHeadSha) return null
  const remoteSha = head?.sha ?? null
  if (remoteSha === expectedHeadSha) return null
  return {
    ok: false,
    conflict: true,
    remoteSha,
    expectedSha: expectedHeadSha,
    branch,
    message:
      'The remote branch changed since your last push (it was edited on GitHub). Review the diff on GitHub, then push again to merge the changes.',
  }
}

/** Safety checks: path validity, exclusions, and the secret scan. */
function prepareFiles(files: ProjectFile[]): Prepared {
  const { included, excluded } = filterFiles(files)

  const invalid = included.filter((file) => !isValidPath(file.path))
  if (invalid.length > 0) {
    return {
      ok: false,
      conflict: false,
      error: 'invalid_path',
      message: `Unsafe paths in the project: ${invalid.map((file) => file.path).join(', ')}`,
    }
  }
  if (included.length === 0) {
    return { ok: false, conflict: false, error: 'empty', message: 'Nothing to push — every file was filtered out (.env, .git, node_modules).' }
  }

  const findings = scanForSecrets(included)
  if (findings.length > 0) {
    return {
      ok: false,
      conflict: false,
      error: 'secrets',
      message: `Possible secrets found in ${findings.length} file(s). Remove them (use environment variables) and push again.`,
      findings,
    }
  }
  return { ok: true, included, excluded }
}

async function createBlob(client: GitHubClient, owner: string, repo: string, content: string): Promise<string> {
  const blob = await client.post<{ sha: string }>(`/repos/${owner}/${repo}/git/blobs`, {
    content: toBase64(content),
    encoding: 'base64',
  })
  return blob.sha
}

function toErrorResult(error: GitHubError): Extract<PushResult, { ok: false }> {
  if (error instanceof RateLimitError) {
    return { ok: false, conflict: false, error: 'rate_limited', message: error.message, retryAt: error.resetAt?.toISOString() }
  }
  if (error instanceof AuthError) {
    return {
      ok: false,
      conflict: false,
      error: 'auth',
      message: 'Your GitHub access token is expired or revoked. Reconnect GitHub and try again.',
    }
  }
  return { ok: false, conflict: false, error: 'github', message: error.message }
}

/**
 * BULK PUSH: the entire project as ONE atomic commit.
 * blobs → tree (base_tree = HEAD tree) → commit (parents = [HEAD]) → PATCH ref.
 */
export async function bulkPush(input: PushInput): Promise<PushResult> {
  const { client, owner, repo, branch, files, message, expectedHeadSha } = input

  try {
    const repoCheck = await checkRepository(client, owner, repo)
    if (!repoCheck.ok) return repoCheck

    const head = await resolveHead(client, owner, repo, branch)
    const conflict = checkConflict(head, expectedHeadSha, branch)
    if (conflict) return conflict

    const prepared = prepareFiles(files)
    if (!prepared.ok) return prepared

    // Create one blob per file (base64), in small batches.
    const shas = new Map<string, string>()
    for (let i = 0; i < prepared.included.length; i += BLOB_CONCURRENCY) {
      const batch = prepared.included.slice(i, i + BLOB_CONCURRENCY)
      const results = await Promise.all(
        batch.map(async (file) => ({ path: file.path, sha: await createBlob(client, owner, repo, file.content) })),
      )
      for (const result of results) shas.set(result.path, result.sha)
    }

    const entries = buildTreeEntries([...shas].map(([path, sha]) => ({ path, sha })))
    const tree = await client.post<{ sha: string }>(`/repos/${owner}/${repo}/git/trees`, createTreePayload(entries, head?.treeSha))
    const commit = await client.post<{ sha: string }>(`/repos/${owner}/${repo}/git/commits`, {
      message,
      tree: tree.sha,
      parents: head ? [head.sha] : [],
    })

    if (head) {
      // force: false — GitHub rejects the update if the branch moved in between,
      // which surfaces as a conflict instead of a lost remote commit.
      await client.patch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, { sha: commit.sha, force: false })
    } else {
      await client.post(`/repos/${owner}/${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: commit.sha })
    }

    return { ok: true, commitSha: commit.sha, pushedFiles: prepared.included.map((file) => file.path), excludedFiles: prepared.excluded }
  } catch (error) {
    if (error instanceof GitHubError) return toErrorResult(error)
    throw error
  }
}

/**
 * SINGLE-FILE PUSH: update one file via the Contents API.
 * Includes the existing blob's sha when the file is already on the remote.
 */
export async function singleFilePush(input: PushInput): Promise<PushResult> {
  const { client, owner, repo, branch, files, message, expectedHeadSha } = input

  try {
    const repoCheck = await checkRepository(client, owner, repo)
    if (!repoCheck.ok) return repoCheck

    const head = await resolveHead(client, owner, repo, branch)
    const conflict = checkConflict(head, expectedHeadSha, branch)
    if (conflict) return conflict

    const prepared = prepareFiles(files)
    if (!prepared.ok) return prepared
    const file = prepared.included[0]

    let existingSha: string | undefined
    try {
      const contents = await client.get<{ sha: string }>(`/repos/${owner}/${repo}/contents/${encodePath(file.path)}?ref=${branch}`)
      existingSha = contents.sha
    } catch (error) {
      if (!(error instanceof NotFoundError)) throw error
    }

    const response = await client.put<{ commit: { sha: string } }>(`/repos/${owner}/${repo}/contents/${encodePath(file.path)}`, {
      message,
      content: toBase64(file.content),
      branch,
      ...(existingSha ? { sha: existingSha } : {}),
    })

    return { ok: true, commitSha: response.commit.sha, pushedFiles: [file.path], excludedFiles: prepared.excluded }
  } catch (error) {
    if (error instanceof GitHubError) return toErrorResult(error)
    throw error
  }
}

export type { SecretFinding }
