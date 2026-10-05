import type { ProjectFile } from '@/data/challenges'
import { parseTree, type TreeEntry } from './tree'
import type { ArchitectureNode, Level, Project, Track, World, WorldTheme } from './types'

// Drafts a journey from three things an admin already has: a topic, a folder tree and the
// request flow ("React component → api.js → route → controller → model → MongoDB").
// Every folder becomes a level that unlocks its files, ordered so the data layer comes first
// and the UI last (the reverse of the request flow), and the flow itself becomes the final
// architecture level. Admins then turn levels into terminal, code or bug-hunt levels.

export interface ScaffoldInput {
  id: string
  track: Track
  title: string
  summary?: string
  projectName?: string
  tree: string
  flow?: string
}

export interface FlowNode {
  id: string
  label: string
  tokens: string[]
}

const STOP_WORDS = new Set(['the', 'a', 'an', 'and', 'of', 'to', 'then', 'back', 'same', 'way', 'js', 'ts', 'jsx', 'tsx', 'py', 'java'])
const DATABASE_WORDS = new Set(['mongodb', 'mongo', 'postgres', 'postgresql', 'mysql', 'sqlite', 'database', 'db'])
const ENTRY_FILE = /^(?:(?:server|app|index|main)\.(?:c|m)?(?:js|ts)|manage\.py|main\.py)$/i
const SIDE_THEMES: WorldTheme[] = ['forest', 'dungeon', 'castle', 'lab']

export const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'item'

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** "A → B -> C, then back the same way." → nodes A, B, C and the return-trip sentence. */
export function parseFlow(flow: string): { nodes: FlowNode[]; returnTrip?: string } {
  const parts = flow
    .replace(/\r?\n/g, ' ')
    .split(/\s*(?:→|->|=>|⟶|➜)\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
  let returnTrip: string | undefined
  const last = parts[parts.length - 1]
  // "MongoDB, then back the same way." — punctuation followed by a space ends the last stop ("api.js" does not).
  const tail = last ? /^(.*?)[,.;]\s+(.+)$/.exec(last) : null
  if (tail) {
    parts[parts.length - 1] = tail[1].trim()
    returnTrip = capitalize(tail[2].trim().replace(/\.?$/, '.'))
  }

  const used = new Set<string>()
  const nodes = parts.map((part) => part.replace(/[.,;]+$/, '').trim()).filter(Boolean).map((label) => {
    let id = slugify(label)
    while (used.has(id)) id = `${id}-2`
    used.add(id)
    const words = label.toLowerCase().split(/[^a-z0-9.]+/).filter(Boolean)
    const tokens = new Set<string>()
    for (const word of words) {
      if (word.includes('.')) {
        tokens.add(word)
        tokens.add(word.split('.')[0])
      } else if (!STOP_WORDS.has(word) && word.length > 1) {
        tokens.add(word.replace(/s$/, ''))
      }
      if (DATABASE_WORDS.has(word)) ['db', 'database'].forEach((alias) => tokens.add(alias))
    }
    return { id, label, tokens: [...tokens].filter((token) => token && !STOP_WORDS.has(token)) }
  })
  return { nodes, returnTrip }
}

function starterContent(path: string, about: string) {
  const name = path.split('/').pop() ?? path
  const extension = name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
  const note = about || `TODO: write ${name}`
  if (['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'java', 'kt', 'go'].includes(extension)) return `// ${note}\n`
  if (extension === 'css') return `/* ${note} */\n`
  if (['py', 'yml', 'yaml', 'toml', 'properties', 'sh', 'txt', 'gitignore'].includes(extension) || name.startsWith('.env')) return `# ${note}\n`
  if (extension === 'md') return `# ${name.replace(/\.md$/i, '')}\n\n${about}\n`
  if (extension === 'json') return '{}\n'
  if (['html', 'xml'].includes(extension)) return `<!-- ${note} -->\n`
  return ''
}

interface Group {
  key: string
  side: string
  files: ProjectFile[]
  order: number
}

const parentOf = (path: string) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '')
const lastSegment = (path: string) => path.split('/').pop()!.toLowerCase()

export function scaffoldProject(input: ScaffoldInput): { project: Project; warnings: string[] } {
  const parsed = parseTree(input.tree)
  const warnings = [...parsed.warnings]
  const folders = parsed.entries.filter((entry) => entry.folder)
  const about = (path: string) => parsed.entries.find((entry) => entry.path === path)?.about ?? ''

  // Files grouped by their folder, in tree order. Folders with nothing inside stay visible as empty folders.
  const groups: Group[] = []
  const groupFor = (key: string) => {
    let group = groups.find((item) => item.key === key)
    if (!group) {
      group = { key, side: key.split('/')[0], files: [], order: groups.length }
      groups.push(group)
    }
    return group
  }
  const place = (entry: TreeEntry) => {
    if (entry.folder) {
      const empty = !parsed.entries.some((other) => other.path.startsWith(`${entry.path}/`))
      if (empty) groupFor(entry.path).files.push({ path: `${entry.path}/`, about: entry.about })
      return
    }
    groupFor(parentOf(entry.path)).files.push({ path: entry.path, about: entry.about || `Part of ${parentOf(entry.path) || 'the project root'}.`, content: starterContent(entry.path, entry.about) })
  }
  parsed.entries.forEach(place)
  if (parsed.entries.some((entry) => !entry.folder && !entry.about)) warnings.push('Some files have no "# explanation" in the tree; they got a placeholder.')

  // Match each request-flow stop to the folders that implement it.
  const flow = input.flow?.trim() ? parseFlow(input.flow) : { nodes: [] as FlowNode[] }
  const flowIndex = new Map<string, number>()
  const nodeFiles: Record<string, string[]> = {}
  flow.nodes.forEach((node, index) => {
    const byFolder = groups.filter((group) => group.key && node.tokens.some((token) => lastSegment(group.key).includes(token)))
    const byFile = groups.filter((group) => group.files.some((file) => node.tokens.some((token) => lastSegment(file.path).includes(token))))
    const matched = byFolder.length ? byFolder : byFile
    for (const group of matched) if (!flowIndex.has(group.key)) flowIndex.set(group.key, index)
    nodeFiles[node.id] = byFolder.length
      ? matched.flatMap((group) => group.files.map((file) => file.path))
      : matched.flatMap((group) => group.files.filter((file) => node.tokens.some((token) => lastSegment(file.path).includes(token))).map((file) => file.path))
    if (matched.length === 0) warnings.push(`No folder or file matched the flow step "${node.label}". Map its files by hand in the architecture level.`)
  })

  // Sides (top-level folders) that hold the end of the flow come first: build the data layer before the UI.
  const sides = [...new Set(groups.filter((group) => group.key).map((group) => group.side))]
  const sideRank = (side: string) => Math.max(-1, ...groups.filter((group) => group.side === side && flowIndex.has(group.key)).map((group) => flowIndex.get(group.key)!))
  sides.sort((a, b) => sideRank(b) - sideRank(a) || sides.indexOf(a) - sides.indexOf(b))

  const worlds: World[] = []
  const levels: Level[] = []
  const usedIds = new Set<string>()
  const levelId = (base: string) => {
    let id = slugify(base)
    while (usedIds.has(id)) id = `${id}-2`
    usedIds.add(id)
    return id
  }
  const exploreLevel = (world: string, title: string, folderPath: string, files: ProjectFile[], idBase = folderPath || 'project-root'): Level => {
    const intro = (folderPath && about(folderPath)) || (folderPath ? `What lives in ${folderPath}/ and why it is there.` : 'The files every project starts with.')
    const bullets = files.map((file) => `- \`${file.path}\`${file.about ? `: ${file.about}` : ''}`).join('\n')
    return { id: levelId(idBase), world, kind: 'explore', title, summary: intro, lesson: `${intro}\n\n${bullets}`, adds: files }
  }

  const root = groups.find((group) => group.key === '')
  if (root) {
    worlds.push({ id: 'start', title: 'Project root', subtitle: 'The files every project starts with', theme: 'village' })
    levels.push(exploreLevel('start', 'The big picture', '', root.files))
  }

  sides.forEach((side, sideIndex) => {
    const worldId = slugify(side)
    worlds.push({ id: worldId, title: capitalize(side), subtitle: about(side) || `Everything under ${side}/`, theme: SIDE_THEMES[sideIndex % SIDE_THEMES.length] })
    const own = groups.find((group) => group.key === side)
    const setup = own?.files.filter((file) => !ENTRY_FILE.test(lastSegment(file.path))) ?? []
    const entry = own?.files.filter((file) => ENTRY_FILE.test(lastSegment(file.path))) ?? []
    const inner = groups.filter((group) => group.side === side && group.key !== side)
    const matched = inner.filter((group) => flowIndex.has(group.key)).sort((a, b) => flowIndex.get(b.key)! - flowIndex.get(a.key)! || a.order - b.order)
    const rest = inner.filter((group) => !flowIndex.has(group.key))

    if (setup.length) levels.push(exploreLevel(worldId, `Set up ${side}/`, side, setup))
    for (const group of [...matched, ...rest]) levels.push(exploreLevel(worldId, `${group.key}/`, group.key, group.files))
    if (entry.length) levels.push(exploreLevel(worldId, `Wire up ${side}/`, side, entry, `${side}-entry`))
  })

  if (flow.nodes.length >= 2) {
    worlds.push({ id: 'architecture', title: 'Final architecture', subtitle: 'How one request travels through every file', theme: 'city' })
    const nodes: ArchitectureNode[] = flow.nodes.map((node) => ({ id: node.id, label: node.label, role: `Where "${node.label}" happens.`, files: nodeFiles[node.id] ?? [] }))
    levels.push({
      id: levelId('trace-request'),
      world: 'architecture',
      kind: 'architecture',
      boss: true,
      title: 'Trace a request',
      summary: 'Put every stop of a request in order.',
      lesson: `A request passes through ${flow.nodes.length} stops: ${flow.nodes.map((node) => node.label).join(' → ')}. Put them in order.`,
      nodes,
      returnTrip: flow.returnTrip,
    })
  } else if (input.flow?.trim()) {
    warnings.push('The flow needs at least two steps separated by → or -> to make an architecture level.')
  }

  const projectFolders = Object.fromEntries(folders.filter((folder) => folder.about).map((folder) => [folder.path, folder.about]))
  return {
    project: {
      id: input.id,
      track: input.track,
      title: input.title,
      summary: input.summary?.trim() || `Build a ${input.title} step by step.`,
      projectName: input.projectName?.trim() || parsed.root || input.id,
      folders: projectFolders,
      worlds,
      levels,
    },
    warnings,
  }
}
