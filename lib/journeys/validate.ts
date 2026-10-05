import { runChecks } from './checks'
import { matchesStep } from './commands'
import { buildOrder } from './snapshot'
import { isTrack, type Level, type Project } from './types'

export const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/
export const MAX_DEFINITION_BYTES = 2_000_000

const KINDS = ['explore', 'command', 'edit', 'bugfix', 'build', 'architecture']
const THEMES = ['village', 'forest', 'dungeon', 'castle', 'lab', 'city']
const CHECK_TYPES = ['includes', 'excludes', 'matches', 'notMatches']

type Json = Record<string, unknown>
const isObject = (value: unknown): value is Json => !!value && typeof value === 'object' && !Array.isArray(value)
const isText = (value: unknown, allowEmpty = false): value is string => typeof value === 'string' && (allowEmpty || value.trim().length > 0)

/** Relative, forward slashes, no `..`. A trailing "/" marks an empty folder. */
export function isProjectPath(path: unknown): path is string {
  if (typeof path !== 'string' || !path || path.length > 300 || path.startsWith('/') || path.includes('\\')) return false
  const parts = (path.endsWith('/') ? path.slice(0, -1) : path).split('/')
  return parts.every((part) => part !== '' && part !== '.' && part !== '..')
}

function regexError(pattern: unknown, flags?: unknown) {
  try {
    new RegExp(String(pattern), typeof flags === 'string' ? flags : undefined)
    return null
  } catch (error) {
    return error instanceof Error ? error.message : 'invalid regular expression'
  }
}

/**
 * Checks a project definition before it is saved or published. Beyond shape, it proves each
 * level is solvable: reference solutions pass their checks, starters don't, and the canonical
 * command of every terminal step is accepted.
 */
export function validateProject(value: unknown): { ok: true; project: Project } | { ok: false; errors: string[] } {
  const errors: string[] = []
  const add = (where: string, message: string) => errors.push(`${where}: ${message}`)

  if (!isObject(value)) return { ok: false, errors: ['The definition must be a JSON object.'] }
  if (JSON.stringify(value).length > MAX_DEFINITION_BYTES) return { ok: false, errors: ['The definition is larger than 2 MB.'] }

  if (!isText(value.id) || !SLUG.test(value.id)) add('id', 'use lowercase letters, digits and dashes (e.g. "mern-todo")')
  if (!isTrack(value.track)) add('track', 'must be "mern", "django" or "spring"')
  for (const field of ['title', 'summary', 'projectName'] as const) if (!isText(value[field])) add(field, 'is required')
  if (!isObject(value.folders) || Object.entries(value.folders).some(([path, about]) => !isProjectPath(path) || typeof about !== 'string')) {
    add('folders', 'must map folder paths to explanations')
  }

  const worldIds = new Set<string>()
  if (!Array.isArray(value.worlds) || value.worlds.length === 0) add('worlds', 'add at least one world')
  else
    value.worlds.forEach((world, index) => {
      const where = `worlds[${index}]`
      if (!isObject(world)) return add(where, 'must be an object')
      if (!isText(world.id) || !SLUG.test(world.id)) add(where, 'needs a slug id')
      else if (worldIds.has(world.id)) add(where, `duplicate id "${world.id}"`)
      else worldIds.add(world.id)
      if (!isText(world.title)) add(where, 'needs a title')
      if (typeof world.subtitle !== 'string') add(where, 'needs a subtitle')
      if (!THEMES.includes(world.theme as string)) add(where, `theme must be one of ${THEMES.join(', ')}`)
    })

  const levelIds = new Set<string>()
  if (!Array.isArray(value.levels) || value.levels.length === 0) add('levels', 'add at least one level')
  else
    value.levels.forEach((level, index) => {
      const where = `levels[${index}]${isObject(level) && typeof level.id === 'string' ? ` (${level.id})` : ''}`
      if (!isObject(level)) return add(where, 'must be an object')
      if (!isText(level.id) || !SLUG.test(level.id)) add(where, 'needs a slug id')
      else if (levelIds.has(level.id)) add(where, 'duplicate id')
      else levelIds.add(level.id)
      if (!worldIds.has(level.world as string)) add(where, `world "${String(level.world)}" does not exist`)
      for (const field of ['title', 'summary', 'lesson'] as const) if (!isText(level[field])) add(where, `${field} is required`)
      if (level.xp !== undefined && !(Number.isInteger(level.xp) && (level.xp as number) >= 0 && (level.xp as number) <= 10_000)) add(where, 'xp must be a whole number')
      if (!KINDS.includes(level.kind as string)) return add(where, `kind must be one of ${KINDS.join(', ')}`)
      validateLevel(level, (message) => add(where, message))
    })

  // Levels unlock in array order, so they must run through the worlds in order too.
  if (Array.isArray(value.worlds) && Array.isArray(value.levels)) {
    const worldOrder = (value.worlds as Json[]).map((world) => world?.id)
    let reached = 0
    ;(value.levels as Json[]).forEach((level, index) => {
      const position = worldOrder.indexOf(level?.world)
      if (position < 0) return
      if (position < reached) add(`levels[${index}] (${String(level.id)})`, `belongs to an earlier world than the level before it; keep each world's levels together, in world order`)
      reached = Math.max(reached, position)
    })
  }

  return errors.length ? { ok: false, errors } : { ok: true, project: value as unknown as Project }
}

function validateFiles(files: unknown, report: (message: string) => void, label: string) {
  if (!Array.isArray(files)) return report(`${label} must be a list of files`)
  files.forEach((file, index) => {
    if (!isObject(file) || !isProjectPath(file.path)) return report(`${label}[${index}] needs a valid relative path`)
    if (typeof file.about !== 'string') report(`${label}[${index}] (${file.path}) needs an "about" line`)
    if (file.content !== undefined && typeof file.content !== 'string') report(`${label}[${index}] (${file.path}) content must be text`)
  })
}

function validateLevel(level: Json, report: (message: string) => void) {
  switch (level.kind as Level['kind']) {
    case 'explore': {
      validateFiles(level.adds, report, 'adds')
      const quiz = level.quiz
      if (quiz === undefined) return
      if (!isObject(quiz) || !isText(quiz.question) || !Array.isArray(quiz.options) || quiz.options.length < 2 || !quiz.options.every((option) => isText(option))) {
        return report('quiz needs a question and at least two options')
      }
      if (!Number.isInteger(quiz.answer) || (quiz.answer as number) < 0 || (quiz.answer as number) >= quiz.options.length) report('quiz.answer must be the index of the right option')
      if (typeof quiz.explain !== 'string') report('quiz.explain is required')
      return
    }

    case 'command': {
      if (level.cwd !== undefined && level.cwd !== '' && !isProjectPath(level.cwd)) report('cwd must be a project folder')
      if (!Array.isArray(level.steps) || level.steps.length === 0) return report('add at least one step')
      level.steps.forEach((step, index) => {
        const where = `steps[${index}]`
        if (!isObject(step)) return report(`${where} must be an object`)
        if (!isText(step.goal) || !isText(step.hint)) report(`${where} needs a goal and a hint`)
        if (!Array.isArray(step.accept) || step.accept.length === 0 || !step.accept.every((command) => isText(command))) return report(`${where} needs at least one accepted command`)
        if (step.pattern !== undefined) {
          const problem = regexError(step.pattern)
          if (problem) return report(`${where}.pattern: ${problem}`)
        }
        if (step.cwd !== undefined && step.cwd !== '' && !isProjectPath(step.cwd)) report(`${where}.cwd must be a project folder`)
        if (step.adds !== undefined) validateFiles(step.adds, report, `${where}.adds`)
        if (!matchesStep(step as never, step.accept[0] as string)) report(`${where}: its own first accepted command is rejected`)
      })
      return
    }

    case 'edit':
    case 'bugfix': {
      if (!isProjectPath(level.path) || (level.path as string).endsWith('/')) report('path must be a file path')
      if (typeof level.about !== 'string') report('about is required')
      if (!isText(level.starter, true) || !isText(level.solution)) return report('starter and solution are required')
      if (!Array.isArray(level.checks) || level.checks.length === 0) return report('add at least one check')
      const ids = new Set<string>()
      let checksValid = true
      level.checks.forEach((check, index) => {
        const where = `checks[${index}]`
        if (!isObject(check) || !isText(check.id) || !isText(check.name) || !isText(check.hint) || !isText(check.value)) {
          checksValid = false
          return report(`${where} needs id, name, hint and value`)
        }
        if (ids.has(check.id)) report(`${where}: duplicate id "${check.id}"`)
        ids.add(check.id)
        if (!CHECK_TYPES.includes(check.type as string)) {
          checksValid = false
          return report(`${where}.type must be one of ${CHECK_TYPES.join(', ')}`)
        }
        if (check.type === 'matches' || check.type === 'notMatches') {
          const problem = regexError(check.value, check.flags)
          if (problem) {
            checksValid = false
            report(`${where} (${check.id}): ${problem}`)
          }
        }
      })
      if (!checksValid) return
      const path = level.path as string
      const checks = level.checks as never
      for (const result of runChecks(level.solution as string, path, checks)) if (!result.passed) report(`the solution fails check "${result.id}"`)
      if (runChecks(level.starter as string, path, checks).every((result) => result.passed)) report('the starter already passes every check, so there is nothing to do')
      return
    }

    case 'build': {
      if (!isProjectPath(level.path) || (level.path as string).endsWith('/')) report('path must be a file path')
      if (typeof level.about !== 'string') report('about is required')
      if (!Array.isArray(level.scaffold) || !Array.isArray(level.blocks) || level.blocks.length === 0) return report('scaffold and blocks are required')
      const blocks = level.blocks as Json[]
      if (!blocks.every((block) => isObject(block) && isText(block.id) && isText(block.label) && isText(block.code) && typeof block.what === 'string')) {
        return report('every block needs id, label, code and what')
      }
      if (new Set(blocks.map((block) => block.id)).size !== blocks.length) report('block ids must be unique')
      const slots = (level.scaffold as Json[]).filter((line) => isObject(line) && line.type === 'slot').map((line) => line.slot)
      const answer = buildOrder(level as never)
      const expected = answer.map((_, index) => index + 1)
      if (slots.length !== answer.length || !expected.every((slot) => slots.includes(slot))) {
        report(`the scaffold needs exactly ${answer.length} slots numbered 1–${answer.length}, one per answer block`)
      }
      if (level.steps !== undefined && (!Array.isArray(level.steps) || level.steps.length !== answer.length)) report('steps needs one entry per slot')
      return
    }

    case 'architecture': {
      if (!Array.isArray(level.nodes) || level.nodes.length < 2) return report('add at least two nodes')
      const nodes = level.nodes as Json[]
      if (!nodes.every((node) => isObject(node) && isText(node.id) && isText(node.label) && typeof node.role === 'string' && Array.isArray(node.files))) {
        return report('every node needs id, label, role and files')
      }
      if (new Set(nodes.map((node) => node.id)).size !== nodes.length) report('node ids must be unique')
      return
    }
  }
}
