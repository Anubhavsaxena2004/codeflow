import { runChecks } from './checks'
import { matchesStep } from './commands'
import { buildOrder, solvedBuild } from './snapshot'
import type { Level, Solution, Submission } from './types'

export const MAX_CODE_LENGTH = 50_000

export type Verdict = { ok: true; solution: Solution } | { ok: false; error: string }

const sameOrder = (submitted: unknown, expected: string[]) =>
  Array.isArray(submitted) && submitted.length === expected.length && expected.every((id, index) => submitted[index] === id)

/** Decides whether a submission passes a level. Shared by the API (authoritative) and the UI. */
export function verifyLevel(level: Level, submission: Submission): Verdict {
  switch (level.kind) {
    case 'explore':
      if (!level.quiz) return { ok: true, solution: {} }
      return submission.answer === level.quiz.answer ? { ok: true, solution: { answer: submission.answer } } : { ok: false, error: 'That answer is not right yet.' }

    case 'command': {
      const commands = submission.commands
      if (!Array.isArray(commands) || commands.length !== level.steps.length || commands.some((command) => typeof command !== 'string' || command.length > 500)) {
        return { ok: false, error: 'Send one command per step.' }
      }
      const wrong = level.steps.findIndex((step, index) => !matchesStep(step, commands[index]))
      return wrong < 0 ? { ok: true, solution: { commands } } : { ok: false, error: `Step ${wrong + 1} is not done yet.` }
    }

    case 'edit':
    case 'bugfix': {
      const code = submission.code
      if (typeof code !== 'string' || code.length > MAX_CODE_LENGTH) return { ok: false, error: 'Send the edited file.' }
      const failing = runChecks(code, level.path, level.checks).filter((result) => !result.passed)
      return failing.length === 0 ? { ok: true, solution: { files: { [level.path]: code } } } : { ok: false, error: `${failing.length} check(s) still failing.` }
    }

    case 'build': {
      const order = buildOrder(level)
      return sameOrder(submission.order, order) ? { ok: true, solution: { order, files: { [level.path]: solvedBuild(level) } } } : { ok: false, error: 'The blocks are not in the right order yet.' }
    }

    case 'architecture': {
      const order = level.nodes.map((node) => node.id)
      return sameOrder(submission.order, order) ? { ok: true, solution: { order } } : { ok: false, error: 'The request does not flow in that order.' }
    }
  }
}
