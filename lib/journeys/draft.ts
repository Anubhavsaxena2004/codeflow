import { buildOrder } from './snapshot'
import type { Level, Solution, Submission } from './types'

// A level draft is everything the learner has done in a level so far, so a refresh, a trip to
// the map or another device picks up exactly where they left off. Signed-in learners keep it in
// level_drafts (migration 006); guests keep it in localStorage. Nothing in it is trusted: passing
// a level is still verified on the server from the submission.

export interface LevelDraft {
  /** When it was saved (ms since epoch), so the newer of two copies wins. */
  savedAt?: number
  /** The level was passed and this is the finished state. */
  passed?: boolean
  wrong: number
  hints: number
  hintLevel: number
  /** explore */
  opened?: string[]
  answer?: number | null
  eliminated?: number[]
  /** command: one accepted command per finished step. */
  typed?: string[]
  /** edit / bugfix */
  code?: string
  /** build: block id per slot. */
  slots?: (string | null)[]
  hinted?: number[]
  /** architecture: node id per position. */
  arrangement?: (string | null)[]
}

/** The largest draft the server stores (JSON characters). A code level's file is the big part. */
export const MAX_DRAFT_CHARS = 200_000

const count = (value: unknown, max = 100_000) => (Number.isInteger(value) && (value as number) >= 0 ? Math.min(value as number, max) : 0)
const strings = (value: unknown, max: number) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, max) : undefined)

/** Ids that fit the level's slots: known ids, each used once, padded or cut to the slot count. */
function arrangementOf(value: unknown, known: string[], length: number) {
  if (!Array.isArray(value)) return undefined
  const seen = new Set<string>()
  return Array.from({ length }, (_, index) => {
    const id = value[index]
    if (typeof id !== 'string' || !known.includes(id) || seen.has(id)) return null
    seen.add(id)
    return id
  })
}

/**
 * Checks a stored draft against the level as it is now (an admin may have edited it since), and
 * drops whatever no longer fits. Returns null for anything that is not a draft.
 */
export function readDraft(value: unknown, level: Level): LevelDraft | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  const draft: LevelDraft = {
    savedAt: typeof raw.savedAt === 'number' && Number.isFinite(raw.savedAt) ? raw.savedAt : 0,
    passed: raw.passed === true,
    wrong: count(raw.wrong),
    hints: count(raw.hints, 1000),
    hintLevel: count(raw.hintLevel, 100),
  }

  switch (level.kind) {
    case 'explore': {
      draft.opened = strings(raw.opened, 500)
      const options = level.quiz?.options.length ?? 0
      draft.answer = Number.isInteger(raw.answer) && (raw.answer as number) >= 0 && (raw.answer as number) < options ? (raw.answer as number) : null
      draft.eliminated = (Array.isArray(raw.eliminated) ? raw.eliminated : []).filter((item): item is number => Number.isInteger(item) && item >= 0 && item < options)
      break
    }
    case 'command':
      // A step only counts if its command still matches; the workspace re-checks each one.
      draft.typed = strings(raw.typed, level.steps.length)
      break
    case 'edit':
    case 'bugfix':
      if (typeof raw.code === 'string') draft.code = raw.code
      break
    case 'build': {
      const order = buildOrder(level)
      draft.slots = arrangementOf(raw.slots, level.blocks.map((block) => block.id), order.length)
      draft.hinted = (Array.isArray(raw.hinted) ? raw.hinted : []).filter((item): item is number => Number.isInteger(item) && item >= 0 && item < order.length)
      break
    }
    case 'architecture':
      draft.arrangement = arrangementOf(raw.arrangement, level.nodes.map((node) => node.id), level.nodes.length)
      break
  }
  return draft
}

/** The submission a draft amounts to, to check that a "passed" draft really solves the level. */
export function submissionOf(level: Level, draft: LevelDraft): Submission {
  switch (level.kind) {
    case 'explore':
      return draft.answer === null || draft.answer === undefined ? {} : { answer: draft.answer }
    case 'command':
      return { commands: draft.typed ?? [] }
    case 'edit':
    case 'bugfix':
      return { code: draft.code ?? level.starter }
    case 'build':
      return { order: draft.slots ?? [] }
    case 'architecture':
      return { order: draft.arrangement ?? [] }
  }
}

/** The finished state of a level the learner passed before, rebuilt from the saved solution. */
export function draftFromSolution(level: Level, solution: Solution): LevelDraft | null {
  const base = { passed: true, wrong: 0, hints: 0, hintLevel: 0 }
  switch (level.kind) {
    case 'explore':
      return { ...base, opened: level.adds.map((file) => file.path), answer: solution.answer ?? null, eliminated: [] }
    case 'command':
      return solution.commands ? { ...base, typed: solution.commands } : null
    case 'edit':
    case 'bugfix': {
      const code = solution.files?.[level.path]
      return typeof code === 'string' ? { ...base, code } : null
    }
    case 'build':
      return solution.order ? readDraft({ ...base, slots: solution.order }, level) : null
    case 'architecture':
      return solution.order ? readDraft({ ...base, arrangement: solution.order }, level) : null
  }
}

/**
 * Files and folders the learner created in the explorer, for one journey or challenge. Folders
 * end in "/". They are the learner's own scratch space and are kept apart from the level files.
 */
export interface LearnerFiles {
  files: Record<string, string>
  folders: string[]
}

export const MAX_LEARNER_FILES = 100
export const MAX_LEARNER_FILE_CHARS = 100_000

/** A path the explorer may create: relative, no `..`, no backslashes, a sane length and characters. */
export function isLearnerPath(path: string) {
  if (!path || path.length > 200 || path.startsWith('/') || path.includes('\\')) return false
  return path.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..' && /^[\w.@()+\- ]+$/.test(segment))
}

export function readLearnerFiles(value: unknown): LearnerFiles {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
  const files: Record<string, string> = {}
  const source = raw.files && typeof raw.files === 'object' && !Array.isArray(raw.files) ? (raw.files as Record<string, unknown>) : {}
  for (const [path, content] of Object.entries(source).slice(0, MAX_LEARNER_FILES)) {
    if (isLearnerPath(path) && typeof content === 'string' && content.length <= MAX_LEARNER_FILE_CHARS) files[path] = content
  }
  const folders = (Array.isArray(raw.folders) ? raw.folders : [])
    .filter((path): path is string => typeof path === 'string' && path.endsWith('/') && isLearnerPath(path.slice(0, -1)))
    .slice(0, MAX_LEARNER_FILES)
  return { files, folders: [...new Set(folders)] }
}
