import { signupChallenge, type Challenge, type ProjectFile, type ScaffoldLine, type Stack } from './signup'

export * from './signup'

const registry: Record<string, Challenge> = {
  [signupChallenge.id]: signupChallenge,
}

export function getChallenge(id: string): Challenge | undefined {
  return Object.hasOwn(registry, id) ? registry[id] : undefined
}

/** Distractor blocks are prefixed `bad-`; every other block, in listed order, is the answer. */
export function solutionOrder(challenge: Challenge): string[] {
  return challenge.blocks.filter((block) => !block.id.startsWith('bad-')).map((block) => block.id)
}

export function availableStacks(challenge: Challenge): Stack[] {
  const stacks = challenge.stacks ? (Object.keys(challenge.stacks) as Stack[]) : []
  return stacks.length ? stacks : ['express']
}

export interface Workspace {
  stack: Stack
  projectName: string
  scaffold: ScaffoldLine[]
  files: ProjectFile[]
  folders: Record<string, string>
  challengePath: string
  codeFor: (blockId: string) => string
}

/** Everything the editor needs for one stack, with fallbacks for challenges that only define the base stack. */
export function workspaceFor(challenge: Challenge, stack: Stack): Workspace {
  const variant = challenge.stacks?.[stack]
  const files = variant?.files.length ? variant.files : [{ path: challenge.fileName, about: 'The file you are building.', challenge: true }]
  const challengePath = (files.find((file) => file.challenge) ?? files[0]).path

  return {
    stack,
    projectName: variant?.projectName ?? challenge.id,
    scaffold: variant?.scaffold ?? challenge.scaffold,
    files,
    folders: variant?.folders ?? {},
    challengePath,
    codeFor: (blockId) => variant?.blocks?.[blockId] ?? challenge.blocks.find((block) => block.id === blockId)?.code ?? '',
  }
}
