import type { GitHubClient } from './client'
import { NotFoundError } from './client'
import { getLinkedRepo, linkRepo } from './store'
import type { LinkedRepo } from './types'

const REPO_NAME = /^[A-Za-z0-9._-]{1,100}$/

export type TargetRepo = LinkedRepo

export type RepoResolution =
  | { ok: true; repo: TargetRepo }
  | { ok: false; error: 'repo_missing' | 'no_push_access' | 'invalid_name'; message: string }

/** "owner/repo", or just "repo" to mean a repo owned by the connected account. */
export function parseExistingRepo(value: string, defaultOwner: string): { owner: string; repo: string } | null {
  const parts = value.split('/')
  if (parts.length === 1) {
    const repo = parts[0]
    return REPO_NAME.test(repo) ? { owner: defaultOwner, repo } : null
  }
  if (parts.length === 2) {
    const [owner, repo] = parts
    return REPO_NAME.test(owner) && REPO_NAME.test(repo) ? { owner, repo } : null
  }
  return null
}

/** Human-friendly default name for a first push, e.g. "mern-todo" → "mern-todo-app". */
export function defaultRepoName(journeyId: string): string {
  const slug = journeyId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `${slug || 'project'}-app`
}

/**
 * Decides which repo a push goes to:
 * 1. the repo already linked to this user+journey,
 * 2. a repo the user chose (verified they have push access),
 * 3. a newly created repo (auto_init: true so the default branch exists).
 * The choice is stored so later pushes target the same repo.
 */
export async function resolveTargetRepo(options: {
  userId: string
  journeyId: string
  client: GitHubClient
  /** Connected account's GitHub login. */
  login: string
  /** "owner/repo" or "repo" — the user's pick from their existing repos. */
  existingRepo?: string
  /** Name for the new repo when nothing is linked yet. */
  repoName?: string
}): Promise<RepoResolution> {
  const linked = await getLinkedRepo(options.userId, options.journeyId)
  if (linked) return { ok: true, repo: linked }

  if (options.existingRepo) {
    const parsed = parseExistingRepo(options.existingRepo, options.login)
    if (!parsed) {
      return { ok: false, error: 'invalid_name', message: 'Enter a repository as "owner/name" or "name".' }
    }
    let repository: { owner?: { login?: string }; default_branch?: string; permissions?: { push?: boolean } }
    try {
      repository = await options.client.get(`/repos/${parsed.owner}/${parsed.repo}`)
    } catch (error) {
      if (error instanceof NotFoundError) {
        return { ok: false, error: 'repo_missing', message: `Repository ${parsed.owner}/${parsed.repo} was not found.` }
      }
      throw error
    }
    if (repository.permissions?.push !== true) {
      return { ok: false, error: 'no_push_access', message: `You don't have push access to ${parsed.owner}/${parsed.repo}.` }
    }
    const target: TargetRepo = {
      owner: repository.owner?.login ?? parsed.owner,
      repo: parsed.repo,
      branch: repository.default_branch || 'main',
      lastCommitSha: null,
    }
    await linkRepo(options.userId, options.journeyId, target)
    return { ok: true, repo: target }
  }

  const name = options.repoName ?? defaultRepoName(options.journeyId)
  if (!REPO_NAME.test(name) || name === '.' || name === '..') {
    return { ok: false, error: 'invalid_name', message: 'That repository name is not allowed.' }
  }
  const created = await options.client.post<{ owner?: { login?: string }; default_branch?: string }>('/user/repos', {
    name,
    auto_init: true,
    private: true,
  })
  const target: TargetRepo = {
    owner: created.owner?.login ?? options.login,
    repo: name,
    branch: created.default_branch || 'main',
    lastCommitSha: null,
  }
  await linkRepo(options.userId, options.journeyId, target)
  return { ok: true, repo: target }
}
