/** A project file as stored in user_project_files. */
export interface ProjectFile {
  path: string
  /** UTF-8 file contents. */
  content: string
}

export interface GitHubConnection {
  githubUserId: string
  githubLogin: string
}

export interface LinkedRepo {
  owner: string
  repo: string
  branch: string
  /** Sha of our last successful push to this branch; null until the first push. */
  lastCommitSha: string | null
}

export interface SecretFinding {
  path: string
  kind: string
  line: number
}

export type PushErrorCode =
  | 'repo_missing'
  | 'no_push_access'
  | 'secrets'
  | 'empty'
  | 'invalid_path'
  | 'rate_limited'
  | 'auth'
  | 'github'

export type PushResult =
  | {
      ok: true
      commitSha: string
      pushedFiles: string[]
      /** Paths skipped by the safety filter (e.g. .env, node_modules). */
      excludedFiles: string[]
    }
  | {
      ok: false
      conflict: true
      /** Sha currently on the remote branch (null if the branch vanished). */
      remoteSha: string | null
      expectedSha: string | null
      branch: string
      message: string
    }
  | {
      ok: false
      conflict?: false
      error: PushErrorCode
      message: string
      findings?: SecretFinding[]
      /** ISO timestamp when a rate-limited push can be retried. */
      retryAt?: string
    }
