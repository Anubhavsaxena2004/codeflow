import type { GitHubClient } from './client'
import { NotFoundError } from './client'
import { defaultRepoName, isValidRepoName, parseExistingRepo } from './repo-name'
import { getLinkedRepo, linkRepo } from './store'
import type { LinkedRepo } from './types'

export { defaultRepoName, parseExistingRepo } from './repo-name'

export type TargetRepo = LinkedRepo

/** The persistence resolveTargetRepo needs; injectable so tests stay DB-free. */
export interface RepoStore {
  getLinkedRepo: (userId: string, journeyId: string) => Promise<LinkedRepo | null>
  linkRepo: (userId: string, journeyId: string, repo: Omit<LinkedRepo, 'lastCommitSha'>) => Promise<void>
}

export type RepoResolution =
  | { ok: true; repo: TargetRepo }
  | { ok: false; error: 'repo_missing' | 'no_push_access' | 'invalid_name'; message: string }

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
  /** Defaults to the real store; tests pass a fake. */
  store?: RepoStore
}): Promise<RepoResolution> {
  const store = options.store ?? { getLinkedRepo, linkRepo }
  const linked = await store.getLinkedRepo(options.userId, options.journeyId)
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
    await store.linkRepo(options.userId, options.journeyId, target)
    return { ok: true, repo: target }
  }

  const name = options.repoName ?? defaultRepoName(options.journeyId)
  if (!isValidRepoName(name)) {
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
  await store.linkRepo(options.userId, options.journeyId, target)
  return { ok: true, repo: target }
}
