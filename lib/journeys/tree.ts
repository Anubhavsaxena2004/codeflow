// Turns a pasted folder tree into project paths. Three shapes are understood:
//
//   todo-app/                        server/                 server/models/Todo.js  # schema
//   ├── server/      # Express      models/                server/server.js
//   │   └── server.js                  Todo.js  # schema
//   └── README.md                  server.js
//
// Text after "#" or "//" (with a space before it) is the explanation for that file or folder.
// A trailing "/" marks a folder; so does having children.

export interface TreeEntry {
  path: string
  folder: boolean
  about: string
}

export interface ParsedTree {
  /** The top line, when the tree starts with a single root folder such as "todo-app/". */
  root: string | null
  entries: TreeEntry[]
  warnings: string[]
}

const CONNECTOR = /(├──|└──|\|--|`--|\+--)/
const NOISE = /^[\s│|]*$/

function splitComment(text: string) {
  const match = /\s(?:#|\/\/)\s?(.*)$/.exec(` ${text}`)
  if (!match) return { name: text.trim(), about: '' }
  return { name: ` ${text}`.slice(0, match.index).trim(), about: match[1].trim() }
}

interface RawLine {
  depth: number
  text: string
}

/** Box-drawing trees: depth comes from where the connector sits (4 columns per level). */
function boxLines(lines: string[]): RawLine[] {
  const raw: RawLine[] = []
  for (const line of lines) {
    if (NOISE.test(line)) continue
    const match = CONNECTOR.exec(line)
    if (!match) {
      raw.push({ depth: 0, text: line.trim() })
      continue
    }
    raw.push({ depth: Math.round(match.index / 4) + 1, text: line.slice(match.index + match[0].length).trim() })
  }
  return raw
}

/**
 * Pasted from a PDF, line breaks are often lost. Depth then comes from the bars before each
 * connector. A blank "│" spacer line merges into the next entry and adds one bar too many;
 * since "└──" closes its folder, an entry right after it can't be its sibling, which undoes that.
 */
function singleLine(text: string): RawLine[] {
  const raw: (RawLine & { closes: boolean })[] = []
  const pattern = /((?:[│|]\s*)*)(├──|└──)/g
  let last = 0
  let depth = 0
  let closes = false
  let match: RegExpExecArray | null
  const push = (body: string) => {
    if (!body) return
    const previous = raw[raw.length - 1]
    raw.push({ depth: previous?.closes && depth === previous.depth ? depth - 1 : depth, text: body, closes })
  }
  while ((match = pattern.exec(text))) {
    push(text.slice(last, match.index).trim())
    depth = (match[1].match(/[│|]/g)?.length ?? 0) + 1
    closes = match[2] === '└──'
    last = match.index + match[0].length
  }
  push(text.slice(last).trim())
  return raw
}

/** Indented outlines: depth from leading spaces (tabs count as 4). */
function indentLines(lines: string[]): RawLine[] {
  const widths = lines.filter((line) => line.trim()).map((line) => line.replace(/\t/g, '    ').match(/^ */)![0].length)
  const step = widths.filter((width) => width > 0).reduce((min, width) => Math.min(min, width), Infinity)
  return lines
    .filter((line) => line.trim())
    .map((line) => ({ depth: Number.isFinite(step) ? Math.round(line.replace(/\t/g, '    ').match(/^ */)![0].length / step) : 0, text: line.trim().replace(/^[-*]\s+/, '') }))
}

export function parseTree(text: string): ParsedTree {
  const warnings: string[] = []
  const lines = text.replace(/\r/g, '').split('\n')
  const connectors = (text.match(/├──|└──/g) ?? []).length

  let raw: RawLine[]
  if (connectors > 0 && lines.filter((line) => line.trim()).length < connectors) {
    warnings.push('The tree had no line breaks (common when copying from a PDF), so nesting was guessed from the │ bars. Check the result.')
    raw = singleLine(text.replace(/\n/g, ' '))
  } else if (connectors > 0 || /\|--|`--/.test(text)) {
    raw = boxLines(lines)
  } else {
    raw = indentLines(lines)
  }

  // A lone first line at depth 0 followed by deeper lines is the project root.
  let root: string | null = null
  const first = raw[0]
  if (first && first.depth === 0 && raw.slice(1).every((line) => line.depth > 0)) {
    root = splitComment(first.text).name.replace(/\/+$/, '') || null
    raw = raw.slice(1).map((line) => ({ ...line, depth: line.depth - 1 }))
  }

  const entries: TreeEntry[] = []
  // ancestors[d] is the full path of the open folder at depth d.
  const ancestors: string[] = []
  raw.forEach((line, index) => {
    const { name, about } = splitComment(line.text)
    if (!name || name === '.' || name === '..') return
    const depth = Math.min(line.depth, ancestors.length)
    ancestors.length = depth
    const parent = ancestors[depth - 1] ?? ''

    // A line holding a whole path ("server/models/Todo.js") is fine at any depth.
    const clean = name.replace(/^\.\//, '').replace(/\\/g, '/')
    const parts = clean.replace(/\/+$/, '').split('/').filter(Boolean)
    if (parts.some((part) => part === '..')) {
      warnings.push(`Skipped "${name}": paths cannot go above the project root.`)
      return
    }
    const next = raw[index + 1]
    const folder = clean.endsWith('/') || (!!next && next.depth > line.depth)
    const join = (count: number) => [parent, ...parts.slice(0, count)].filter(Boolean).join('/')
    const path = join(parts.length)

    // Intermediate folders of a nested path ("a/b/c.js") are folders too.
    for (let count = 1; count < parts.length; count++) {
      if (!entries.some((entry) => entry.path === join(count))) entries.push({ path: join(count), folder: true, about: '' })
    }

    const existing = entries.find((entry) => entry.path === path)
    if (existing) {
      existing.about ||= about
      existing.folder ||= folder
    } else {
      entries.push({ path, folder, about })
    }
    if (folder) ancestors[depth] = path
  })

  if (entries.length === 0) warnings.push('No files or folders were found.')
  return { root, entries, warnings }
}
