const REPO_NAME = /^[A-Za-z0-9._-]{1,100}$/

/** \"owner/repo\", or just \"repo\" to mean a repo owned by the connected account. */
export function parseExistingRepo(value: string, defaultOwner: string): { owner: string; repo: string } | null {
  const parts = value.split('/')
  if (parts.length === 1) {
    const repo = parts[0]
    return isValidRepoName(repo) ? { owner: defaultOwner, repo } : null
  }
  if (parts.length === 2) {
    const [owner, repo] = parts
    return isValidRepoName(owner) && isValidRepoName(repo) ? { owner, repo } : null
  }
  return null
}

/** Human-friendly default name for a first push, e.g. \"mern-todo\" → \"mern-todo-app\". */
export function defaultRepoName(journeyId: string): string {
  const slug = journeyId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `${slug || 'project'}-app`
}

/** True when a repo name is safe to create (references the same rule as parseExistingRepo). */
export function isValidRepoName(name: string): boolean {
  return REPO_NAME.test(name) && name !== '.' && name !== '..'
}
