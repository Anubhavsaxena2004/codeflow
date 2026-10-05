import type { ProjectFile, ScaffoldLine } from '@/data/challenges'
import type { BuildLevel, Level, Project, Solution } from './types'

const indentCode = (code: string, spaces: number) => code.split('\n').map((line) => (line ? ' '.repeat(spaces) + line : line)).join('\n')

/** Distractor blocks are prefixed `bad-`; every other block, in listed order, is the answer. */
export function buildOrder(level: BuildLevel) {
  return level.blocks.filter((block) => !block.id.startsWith('bad-')).map((block) => block.id)
}

/** The file a build level produces once its slots hold `order`. */
export function assembleBuild(scaffold: ScaffoldLine[], codeFor: (blockId: string) => string, order: (string | null)[]) {
  return scaffold
    .map((line) => {
      if (line.type === 'line') return line.text ?? ''
      const id = order[(line.slot ?? 1) - 1]
      return id ? indentCode(codeFor(id), line.indent ?? 0) : ''
    })
    .join('\n')
}

export function solvedBuild(level: BuildLevel) {
  const codeFor = (id: string) => level.blocks.find((block) => block.id === id)?.code ?? ''
  return assembleBuild(level.scaffold, codeFor, buildOrder(level))
}

/** Files a level leaves behind once it is passed. The learner's own code wins over the reference answer. */
export function outputOf(level: Level, solution?: Solution | null): ProjectFile[] {
  switch (level.kind) {
    case 'explore':
      return level.adds
    case 'command':
      return level.steps.flatMap((step) => step.adds ?? [])
    case 'edit':
    case 'bugfix':
      return [{ path: level.path, about: level.about, content: solution?.files?.[level.path] ?? level.solution }]
    case 'build':
      return [{ path: level.path, about: level.about, content: solution?.files?.[level.path] ?? solvedBuild(level) }]
    case 'architecture':
      return []
  }
}

export type FileChange = 'added' | 'modified'

/** A file as the explorer shows it, with a git-style marker for what the current level changed. */
export interface WorkspaceFile extends ProjectFile {
  change?: FileChange
}

/** Layers files on top of a tree. A later file with the same path replaces the earlier one. */
export function layer(base: Map<string, WorkspaceFile>, files: ProjectFile[], mark: boolean) {
  const next = new Map(base)
  for (const file of files) {
    const existing = next.get(file.path)
    next.set(file.path, { ...file, change: mark ? (existing && !existing.path.endsWith('/') ? 'modified' : 'added') : existing?.change })
  }
  return next
}

/** The project tree as it stands when level `index` opens: everything earlier levels produced. */
export function filesBefore(project: Project, index: number, solutions: Record<string, Solution | null | undefined> = {}) {
  let files = new Map<string, WorkspaceFile>()
  for (const level of project.levels.slice(0, index)) files = layer(files, outputOf(level, solutions[level.id]), false)
  return files
}

/**
 * What gets saved for a GitHub push after the learner has passed the first `count` levels:
 * real files only, in path order. Folder markers and tool-generated files (node_modules, venv,
 * lock files) are left out; empty files stay, because Python packages need their __init__.py.
 */
export function projectSnapshot(project: Project, count: number, solutions: Record<string, Solution | null | undefined> = {}) {
  return [...filesBefore(project, count, solutions).values()]
    .filter((file) => !file.path.endsWith('/') && !file.generated)
    .map((file) => ({ path: file.path, content: file.content ?? '' }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}
