import type { JourneyTerm, Level } from './types'

/** The text a learner works with in a level: its code, commands, files and lesson. */
export function levelText(level: Level): string {
  const parts: string[] = [level.lesson]
  switch (level.kind) {
    case 'explore':
      parts.push(...level.adds.map((file) => `${file.path}\n${file.content ?? ''}`))
      if (level.quiz) parts.push(level.quiz.question, ...level.quiz.options)
      break
    case 'command':
      for (const step of level.steps) parts.push(step.accept[0], step.output ?? '', ...(step.adds ?? []).map((file) => `${file.path}\n${file.content ?? ''}`))
      break
    case 'edit':
    case 'bugfix':
      parts.push(level.path, level.starter, level.solution)
      break
    case 'build':
      parts.push(level.path, ...level.scaffold.map((line) => line.text ?? ''), ...level.blocks.map((block) => block.code))
      break
    case 'architecture':
      parts.push(...level.nodes.flatMap((node) => [node.label, node.role, ...node.files]))
      break
  }
  return parts.join('\n')
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** True when `key` appears as a whole token: "201" matches status(201) but not 2010; "_id" matches todo._id. */
function appears(text: string, key: string) {
  const start = /^[\w$]/.test(key) ? '(?<![\\w$])' : ''
  const end = /[\w$]$/.test(key) ? '(?![\\w$])' : ''
  return new RegExp(`${start}${escape(key)}${end}`).test(text)
}

/** The glossary entries a level actually uses, in glossary order. */
export function termsFor(glossary: JourneyTerm[] | undefined, level: Level): JourneyTerm[] {
  if (!glossary?.length) return []
  const text = levelText(level)
  return glossary.filter((entry) => (entry.match?.length ? entry.match : [entry.term]).some((key) => appears(text, key)))
}
