import type { Check } from './types'

type CommentStyle = 'c' | 'hash' | 'none'

const extension = (path: string) => path.split('/').pop()?.split('.').pop()?.toLowerCase() ?? ''

function commentStyle(path: string): CommentStyle {
  const name = path.split('/').pop() ?? ''
  if (name.startsWith('.env') || ['py', 'sh', 'yml', 'yaml', 'toml', 'properties', 'cfg', 'txt'].includes(extension(path))) return 'hash'
  if (['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'java', 'css', 'kt', 'go'].includes(extension(path))) return 'c'
  return 'none'
}

/**
 * Removes comments so a commented-out line never satisfies a check. Quotes are tracked,
 * so "http://…" inside a string survives.
 */
export function stripComments(code: string, path: string): string {
  const style = commentStyle(path)
  if (style === 'none') return code

  let out = ''
  let quote: string | null = null
  for (let index = 0; index < code.length; index++) {
    const char = code[index]
    if (quote) {
      out += char
      if (char === '\\') out += code[++index] ?? ''
      else if (char === quote || (char === '\n' && quote !== '`')) quote = null
      continue
    }
    if (char === '"' || char === "'" || (char === '`' && style === 'c')) {
      quote = char
      out += char
      continue
    }
    const lineComment = style === 'hash' ? char === '#' : char === '/' && code[index + 1] === '/'
    if (lineComment) {
      while (index < code.length && code[index] !== '\n') index++
      out += '\n'
      continue
    }
    if (style === 'c' && char === '/' && code[index + 1] === '*') {
      const end = code.indexOf('*/', index + 2)
      const skipped = code.slice(index, end < 0 ? code.length : end + 2)
      out += '\n'.repeat(skipped.split('\n').length - 1)
      index = end < 0 ? code.length : end + 1
      continue
    }
    out += char
  }
  return out
}

/** Whitespace and quote style don't matter for includes/excludes. */
const squash = (text: string) => text.replace(/\s+/g, '').replace(/['`]/g, '"')

export interface CheckResult {
  id: string
  name: string
  hint: string
  passed: boolean
}

export function runCheck(check: Check, stripped: string, squashed: string): boolean {
  switch (check.type) {
    case 'includes':
      return squashed.includes(squash(check.value))
    case 'excludes':
      return !squashed.includes(squash(check.value))
    case 'matches':
      return new RegExp(check.value, check.flags).test(stripped)
    case 'notMatches':
      return !new RegExp(check.value, check.flags).test(stripped)
  }
}

export function runChecks(code: string, path: string, checks: Check[]): CheckResult[] {
  const stripped = stripComments(code, path)
  const squashed = squash(stripped)
  return checks.map((check) => ({ id: check.id, name: check.name, hint: check.hint, passed: runCheck(check, stripped, squashed) }))
}
