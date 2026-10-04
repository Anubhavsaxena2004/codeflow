import type { ProjectFile, SecretFinding } from './types'

/**
 * Paths that must never be pushed: `.env*`, `.git*` and `node_modules/**`,
 * at any depth. (This intentionally also drops .gitignore and .github —
 * anything whose segment starts with .env or .git.)
 */
export function isExcludedPath(path: string): boolean {
  return path.split('/').some((segment) => {
    if (segment === 'node_modules') return true
    if (segment.startsWith('.env') || segment.startsWith('.git')) return true
    return false
  })
}

export interface FileFilterResult {
  included: ProjectFile[]
  excluded: string[]
}

/** Splits a file list into pushable files and excluded paths. */
export function filterFiles(files: ProjectFile[]): FileFilterResult {
  const included: ProjectFile[] = []
  const excluded: string[] = []
  for (const file of files) {
    if (isExcludedPath(file.path)) excluded.push(file.path)
    else included.push(file)
  }
  return { included, excluded }
}

/** Rejects absolute paths, parent traversal, empty segments and backslashes. */
export function isValidPath(path: string): boolean {
  if (!path || path.length > 500 || path.includes('\\') || path.startsWith('/')) return false
  return path.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..')
}

const SECRET_PATTERNS: ReadonlyArray<{ kind: string; pattern: RegExp }> = [
  { kind: 'aws-access-key-id', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { kind: 'private-key-block', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { kind: 'github-token', pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/ },
  { kind: 'github-fine-grained-token', pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { kind: 'openai-style-key', pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { kind: 'slack-token', pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  { kind: 'jwt', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\b/ },
  {
    // Assignment-style secrets: apiKey: "…", SECRET = '…', password: "…" etc.
    // Env references (process.env.X) are not literals, so they pass.
    kind: 'assigned-secret',
    pattern:
      /\b(api[_-]?key|apikey|secret|client[_-]?secret|password|passwd|pwd|auth[_-]?token|access[_-]?token|private[_-]?key)\s*[:=]\s*["'`][^"'`\s]{8,}["'`]/i,
  },
]

/**
 * Scans file contents for obvious secrets. Returns one finding per
 * (file, pattern) so the push can be blocked with a precise error.
 */
export function scanForSecrets(files: ProjectFile[]): SecretFinding[] {
  const findings: SecretFinding[] = []
  for (const file of files) {
    for (const { kind, pattern } of SECRET_PATTERNS) {
      const match = pattern.exec(file.content)
      if (match) {
        findings.push({ path: file.path, kind, line: file.content.slice(0, match.index).split('\n').length })
      }
    }
  }
  return findings
}
