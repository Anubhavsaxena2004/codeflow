import { runChecks } from './checks'
import type { Check, Gap } from './types'

// A gap is one TODO of an edit level, offered as three choices. Picking one writes it into the
// file in place of the TODO line. Whether a gap is filled comes from its checks, so code the
// learner types by hand fills it just the same.

export const GAP_SOURCE_KINDS = ['import', 'here', 'file', 'param', 'command', 'builtin'] as const

/** Index of the gap's TODO line in the code, or -1 once it has been replaced. */
export function gapLine(code: string, gap: Pick<Gap, 'marker'>) {
  return code.split('\n').findIndex((line) => line.includes(gap.marker))
}

/** The code with option `choice` written over the gap's TODO line, at that line's indentation. Null when the line is gone. */
export function fillGap(code: string, gap: Gap, choice: number): string | null {
  const lines = code.split('\n')
  const at = lines.findIndex((line) => line.includes(gap.marker))
  const option = gap.options[choice]
  if (at < 0 || !option) return null
  const indent = lines[at].match(/^\s*/)?.[0] ?? ''
  lines.splice(at, gap.span ?? 1, ...option.code.split('\n').map((line) => (line ? `${indent}${line}` : line)))
  return lines.join('\n')
}

/** True when every check the gap stands for passes on the code. */
export function gapFilled(code: string, path: string, gap: Gap, checks: Check[]) {
  const own = checks.filter((check) => gap.checks.includes(check.id))
  return own.length > 0 && runChecks(code, path, own).every((result) => result.passed)
}

/** The line that contains `find`: its index and its text, or null. */
export function findLine(content: string | undefined, find: string | undefined) {
  if (!content || !find) return null
  const lines = content.split('\n')
  const index = lines.findIndex((line) => line.includes(find))
  return index < 0 ? null : { index, text: lines[index].trim() }
}

type Json = Record<string, unknown>
const isObject = (value: unknown): value is Json => !!value && typeof value === 'object' && !Array.isArray(value)
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

/**
 * Problems with an edit level's gaps, in plain words. Beyond shape, it proves the gaps teach the
 * level: each right option fills its gap on its own, the right options together solve the level,
 * every wrong option breaks its gap, and no test fails that no gap explains.
 */
export function gapProblems(level: { kind: string; path: string; starter: string; checks: Check[]; gaps?: unknown }): string[] {
  if (level.gaps === undefined) return []
  if (level.kind !== 'edit') return ['gaps are only for edit levels']
  if (!Array.isArray(level.gaps) || level.gaps.length === 0) return ['gaps must be a list of at least one gap']

  const problems: string[] = []
  const checkIds = new Set(level.checks.map((check) => check.id))
  const claimed = new Map<string, number>()
  const gaps = level.gaps as unknown[]
  let usable = true

  gaps.forEach((raw, index) => {
    const where = `gaps[${index}]`
    if (!isObject(raw)) {
      usable = false
      return problems.push(`${where} must be an object`)
    }
    if (!isText(raw.marker)) {
      usable = false
      problems.push(`${where} needs a marker: text on its TODO line`)
    } else {
      const hits = level.starter.split('\n').filter((line) => line.includes(raw.marker as string)).length
      if (hits !== 1) {
        usable = false
        problems.push(`${where}: the marker "${raw.marker}" must appear on exactly one line of the starter (found ${hits})`)
      }
    }
    if (raw.span !== undefined && !(Number.isInteger(raw.span) && (raw.span as number) >= 1 && (raw.span as number) <= 10)) problems.push(`${where}.span must be a whole number from 1 to 10`)
    if (!isText(raw.goal)) problems.push(`${where} needs a goal`)
    if (!Array.isArray(raw.options) || raw.options.length !== 3 || !raw.options.every((option) => isObject(option) && isText(option.code) && isText(option.why))) {
      usable = false
      problems.push(`${where} needs exactly three options, each with code and why`)
    } else if (new Set(raw.options.map((option) => (option as Json).code)).size !== 3) {
      problems.push(`${where}: the three options must differ`)
    }
    if (!Number.isInteger(raw.answer) || (raw.answer as number) < 0 || (raw.answer as number) > 2) {
      usable = false
      problems.push(`${where}.answer must be 0, 1 or 2`)
    }
    if (!Array.isArray(raw.checks) || raw.checks.length === 0 || !raw.checks.every((id) => typeof id === 'string' && checkIds.has(id))) {
      usable = false
      problems.push(`${where}.checks must list ids of this level's checks`)
    } else {
      for (const id of raw.checks as string[]) {
        if (claimed.has(id)) problems.push(`${where}: check "${id}" already belongs to gaps[${claimed.get(id)}]`)
        claimed.set(id, index)
      }
    }
    if (!Array.isArray(raw.sources) || !raw.sources.every((source) => isObject(source) && isText(source.name) && isText(source.note) && GAP_SOURCE_KINDS.includes(source.from as never))) {
      problems.push(`${where}.sources must be a list of { name, from: ${GAP_SOURCE_KINDS.join(' | ')}, note, path?, find? }`)
    }
    if (raw.result !== undefined && !isText(raw.result)) problems.push(`${where}.result must be text`)
  })
  if (!usable || problems.length) return problems

  const typed = gaps as Gap[]
  const solve = (choices: number[]) => typed.reduce<string | null>((code, gap, index) => (code === null ? null : fillGap(code, gap, choices[index])), level.starter)
  const rights = typed.map((gap) => gap.answer)

  const solved = solve(rights)
  if (solved === null) return ['picking every right option loses a TODO line: check the markers and spans']
  for (const result of runChecks(solved, level.path, level.checks)) if (!result.passed) problems.push(`picking every right option fails check "${result.id}"`)

  typed.forEach((gap, index) => {
    const alone = fillGap(level.starter, gap, gap.answer)
    if (alone === null || !gapFilled(alone, level.path, gap, level.checks)) problems.push(`gaps[${index}]: its right option alone does not pass its checks`)
    if (gapFilled(level.starter, level.path, gap, level.checks)) problems.push(`gaps[${index}]: its checks already pass in the starter`)
    gap.options.forEach((_, choice) => {
      if (choice === gap.answer) return
      const wrong = solve(rights.map((right, at) => (at === index ? choice : right)))
      if (wrong !== null && gapFilled(wrong, level.path, gap, level.checks)) problems.push(`gaps[${index}]: wrong option ${choice} passes the gap's checks`)
    })
  })

  const unexplained = level.checks.filter((check) => !claimed.has(check.id))
  for (const result of runChecks(level.starter, level.path, unexplained)) if (!result.passed) problems.push(`check "${result.id}" belongs to no gap, so it must already pass in the starter`)
  return problems
}
