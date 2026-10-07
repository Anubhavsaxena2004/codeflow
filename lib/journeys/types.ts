// A journey is one project (e.g. a MERN todo app) built level by level. Each level adds or
// changes files, so the explorer grows the way a real project does. Definitions are plain
// JSON: bundled ones live in data/journeys, admin-edited ones in the journey_projects table.

import type { Block, GlossaryTerm, ProjectFile, ScaffoldLine, Stack, StepGuide } from '@/data/challenges'

export type Track = 'mern' | 'django' | 'spring'

export const tracks: Record<Track, { label: string; tagline: string; challengeStack: Stack }> = {
  mern: { label: 'MERN', tagline: 'MongoDB · Express · React · Node.js', challengeStack: 'express' },
  django: { label: 'Django', tagline: 'Python · Django · SQLite / PostgreSQL', challengeStack: 'django' },
  spring: { label: 'Spring Boot', tagline: 'Java · Spring Boot · Thymeleaf · MySQL', challengeStack: 'spring' },
}

export const trackIds = Object.keys(tracks) as Track[]

export function isTrack(value: unknown): value is Track {
  return typeof value === 'string' && Object.hasOwn(tracks, value)
}

/** Colours and icon of a world on the map. */
export type WorldTheme = 'village' | 'forest' | 'dungeon' | 'castle' | 'lab' | 'city'

export interface World {
  id: string
  title: string
  subtitle: string
  theme: WorldTheme
}

export interface Quiz {
  question: string
  options: string[]
  /** Index into options. */
  answer: number
  explain: string
}

/**
 * A static test on the learner's code. includes/excludes ignore whitespace and quote style;
 * matches/notMatches take a regular expression. Comments are stripped first, so a commented-out
 * line never counts.
 */
export interface Check {
  id: string
  /** Shown like a test name, e.g. "GET /api/todos returns the list". */
  name: string
  /** Shown when this is the first failing check and the learner asks for a hint. */
  hint: string
  type: 'includes' | 'excludes' | 'matches' | 'notMatches'
  value: string
  flags?: string
}

export interface CommandStep {
  /** What to do, without giving the command away. */
  goal: string
  hint: string
  /** Accepted commands. The first is the canonical one, revealed by the second hint. */
  accept: string[]
  /** Optional regex (full match) for commands with free-form parts, like a commit message. */
  pattern?: string
  /** What the terminal prints. */
  output?: string
  /** Working directory after the command, relative to the project root ('' is the root). */
  cwd?: string
  /** Prompt prefix from now on, e.g. "(venv)" once a virtualenv is active. */
  env?: string
  /** Files the command creates or rewrites. A path ending in "/" is an empty folder. */
  adds?: ProjectFile[]
  /** Shown after the command runs: what just happened. */
  explain?: string
}

interface LevelBase {
  /** Stable slug. Progress rows reference it, so never rename a published level. */
  id: string
  world: string
  title: string
  /** One line for the map. */
  summary: string
  /** Paragraphs separated by blank lines; `code` in backticks; lines starting "- " are bullets. */
  lesson: string
  boss?: boolean
  /** Overrides the default XP for the level kind. */
  xp?: number
}

/** Read and understand: new files appear, the learner opens each one, then answers a question. */
export interface ExploreLevel extends LevelBase {
  kind: 'explore'
  adds: ProjectFile[]
  quiz?: Quiz
}

/** Type real setup commands in the terminal; each one generates files in the explorer. */
export interface CommandLevel extends LevelBase {
  kind: 'command'
  /** Directory the terminal starts in. */
  cwd?: string
  /** Prompt prefix the level starts with, e.g. "(venv)". */
  env?: string
  steps: CommandStep[]
}

/** Edit a file until every check passes: complete TODOs (edit) or fix planted bugs (bugfix). */
export interface CodeLevel extends LevelBase {
  kind: 'edit' | 'bugfix'
  path: string
  about: string
  starter: string
  /** Reference answer. Validation makes sure it passes every check and the starter doesn't. */
  solution: string
  checks: Check[]
  /** edit only: one per TODO, each offered as three choices. Learners can still type their own code. */
  gaps?: Gap[]
}

/**
 * Where a name used in a gap comes from. import: a package, imported at the top of this file.
 * here: defined in this file. file: another file of the project. param: handed in by the framework
 * (req, request, model). command: made by a command run in an earlier level (a database, an
 * environment variable). builtin: part of the language, runtime or tool.
 */
export type GapSourceKind = 'import' | 'here' | 'file' | 'param' | 'command' | 'builtin'

export interface GapSource {
  name: string
  from: GapSourceKind
  /** One sentence: what it is and where it comes from. */
  note: string
  /** The file it lives in; this level's file when left out. */
  path?: string
  /** Text on the defining line, so the workspace can show that line and jump to it. */
  find?: string
}

export interface GapOption {
  code: string
  /** For the right option, what it does; for a wrong one, why it fails. */
  why: string
}

/** A TODO of an edit level, offered as three choices: one right, two wrong. */
export interface Gap {
  /** Text on the TODO line, e.g. "TODO 1:". Picking an option replaces that line, plus `span - 1` more. */
  marker: string
  span?: number
  /** What the code has to do, in plain words. */
  goal: string
  /** Exactly three. */
  options: GapOption[]
  /** Index of the right option. */
  answer: number
  /** Ids of the checks this gap makes pass. */
  checks: string[]
  /** The names the right code uses, and where each one comes from. */
  sources: GapSource[]
  /** What the code hands back or sets up, and who uses it. */
  result?: string
}

/** Arrange code blocks into the slots of a file, like the standalone challenges. */
export interface BuildLevel extends LevelBase {
  kind: 'build'
  path: string
  about: string
  scaffold: ScaffoldLine[]
  /** Blocks whose id starts with "bad-" are distractors; the rest, in listed order, are the answer. */
  blocks: Block[]
  steps?: StepGuide[]
}

export interface ArchitectureNode {
  id: string
  label: string
  /** What happens at this stop. */
  role: string
  files: string[]
}

/** Put the stops of a request in order. Nodes are listed in the correct order. */
export interface ArchitectureLevel extends LevelBase {
  kind: 'architecture'
  nodes: ArchitectureNode[]
  /** How the response travels back. */
  returnTrip?: string
}

export type Level = ExploreLevel | CommandLevel | CodeLevel | BuildLevel | ArchitectureLevel
export type LevelKind = Level['kind']

/** A glossary entry. A level shows it when any of `match` (default: the term itself) appears in its code. */
export interface JourneyTerm extends GlossaryTerm {
  match?: string[]
}

export interface Project {
  /** Slug, also the GitHub journeyId the learner's repo is linked to. */
  id: string
  track: Track
  title: string
  summary: string
  /** Root folder name shown at the top of the explorer. */
  projectName: string
  /** Folder path → what lives there. Shown once the folder exists. */
  folders: Record<string, string>
  worlds: World[]
  levels: Level[]
  /** Terms explained in the workspace's Glossary tab, filtered to the ones each level uses. */
  glossary?: JourneyTerm[]
}

export const kindLabels: Record<LevelKind, string> = {
  explore: 'Concept',
  command: 'Terminal',
  edit: 'Code',
  bugfix: 'Bug hunt',
  build: 'Build',
  architecture: 'Architecture',
}

/** What a learner sends to pass a level. Only the fields for the level's kind are read. */
export interface Submission {
  /** explore: the quiz answer. */
  answer?: number
  /** command: one command per step, in order. */
  commands?: string[]
  /** edit / bugfix: the edited file. */
  code?: string
  /** build: block id per slot. architecture: node id per position. */
  order?: (string | null)[]
}

/** What is stored once a level is passed. `files` is what the learner wrote, by path. */
export interface Solution {
  answer?: number
  commands?: string[]
  order?: string[]
  files?: Record<string, string>
}

export interface LevelProgress {
  projectId: string
  levelId: string
  stars: number
  xp: number
  completedAt: string
}
