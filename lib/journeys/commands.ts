import type { CommandStep } from './types'

// Commands whose trailing arguments are an unordered set of packages and flags.
const INSTALLERS = ['npm install', 'npm i', 'npm add', 'pnpm add', 'yarn add', 'pip install', 'pip3 install', 'python -m pip install']
const FLAG_ALIASES: Record<string, string> = { '-D': '--save-dev', '--dev': '--save-dev', '-S': '--save' }

/** Collapses whitespace, unifies quotes and drops a trailing semicolon. */
export function normalizeCommand(command: string) {
  return command.trim().replace(/;+$/, '').replace(/\s+/g, ' ').replace(/'/g, '"')
}

function installKey(command: string) {
  const installer = INSTALLERS.find((prefix) => command === prefix || command.startsWith(`${prefix} `))
  if (!installer) return null
  const args = command
    .slice(installer.length)
    .split(' ')
    .filter(Boolean)
    .map((arg) => FLAG_ALIASES[arg] ?? arg)
    // --save is npm's default, so it changes nothing
    .filter((arg) => arg !== '--save')
  const tool = installer.split(' ')[0] === 'python' ? 'pip' : installer.split(' ')[0].replace(/3$/, '')
  return `${tool} install ${[...new Set(args)].sort().join(' ')}`
}

function equivalent(typed: string, expected: string) {
  if (typed === expected) return true
  const typedKey = installKey(typed)
  return typedKey !== null && typedKey === installKey(expected)
}

export function matchesStep(step: CommandStep, command: string) {
  const typed = normalizeCommand(command)
  if (!typed) return false
  if (step.accept.some((accepted) => equivalent(typed, normalizeCommand(accepted)))) return true
  return !!step.pattern && new RegExp(`^(?:${step.pattern})$`).test(typed)
}
