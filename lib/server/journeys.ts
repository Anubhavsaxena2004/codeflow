import { bundledProjects } from '@/data/journeys'
import { xpFor } from '@/lib/journeys/progress'
import type { Level, Project } from '@/lib/journeys/types'
import { query } from './db'

// Journey content comes from two places: the bundled definitions in data/journeys, and the
// journey_projects table where admin edits live. A row wins over the bundled journey with the
// same id. Without a database (or before the migration has run) the bundled ones still work.

export interface CatalogEntry {
  project: Project
  published: boolean
  position: number
  /** bundled: shipped with the app. edited: a bundled journey overridden in the admin. custom: admin-only. */
  source: 'bundled' | 'edited' | 'custom'
  updatedAt: string | null
}

interface Row {
  id: string
  published: boolean
  position: number
  definition: Project
  updatedAt: string
}

const UNDEFINED_TABLE = '42P01'

async function storedRows(): Promise<Row[]> {
  if (!process.env.DATABASE_URL) return []
  try {
    return await query<Row>(
      `SELECT id, published, position, definition, updated_at AS "updatedAt"
         FROM journey_projects
        ORDER BY position, id`,
    )
  } catch (error) {
    // Pages keep working on bundled content when the database is unreachable or not migrated yet.
    if ((error as { code?: string }).code !== UNDEFINED_TABLE) console.error('Could not load journeys from the database:', error)
    return []
  }
}

export async function listCatalog({ includeDrafts = false } = {}): Promise<CatalogEntry[]> {
  const rows = await storedRows()
  const byId = new Map(rows.map((row) => [row.id, row]))
  const entries: CatalogEntry[] = bundledProjects.map((project, index) => {
    const row = byId.get(project.id)
    return row
      ? { project: row.definition, published: row.published, position: row.position, source: 'edited', updatedAt: row.updatedAt }
      : { project, published: true, position: index, source: 'bundled', updatedAt: null }
  })
  for (const row of rows) {
    if (!bundledProjects.some((project) => project.id === row.id)) {
      entries.push({ project: row.definition, published: row.published, position: row.position, source: 'custom', updatedAt: row.updatedAt })
    }
  }
  return entries.filter((entry) => includeDrafts || entry.published).sort((a, b) => a.position - b.position || a.project.id.localeCompare(b.project.id))
}

export async function getCatalogEntry(id: string, { includeDrafts = false } = {}) {
  return (await listCatalog({ includeDrafts })).find((entry) => entry.project.id === id) ?? null
}

export async function getPublishedProject(id: string) {
  return (await getCatalogEntry(id))?.project ?? null
}

/** Mission bullets for the level card on the map. */
function tasksOf(level: Level): string[] {
  switch (level.kind) {
    case 'command':
      return level.steps.map((step) => step.goal)
    case 'edit':
    case 'bugfix':
      return level.checks.map((check) => check.name)
    case 'build':
      return (level.steps ?? []).map((step) => `${step.kind}: ${step.goal}`)
    case 'explore':
      return [`Open ${level.adds.filter((file) => !file.path.endsWith('/') && !file.generated).length} new file(s)`, ...(level.quiz ? ['Answer the question'] : [])]
    case 'architecture':
      return [`Put ${level.nodes.length} stops in order`]
  }
}

/** Light version for the map: no file contents, starters or solutions. */
export function summarize(project: Project) {
  return {
    id: project.id,
    track: project.track,
    title: project.title,
    summary: project.summary,
    projectName: project.projectName,
    worlds: project.worlds,
    levels: project.levels.map((level) => ({
      id: level.id,
      world: level.world,
      kind: level.kind,
      title: level.title,
      summary: level.summary,
      boss: !!level.boss,
      xp: xpFor(level),
      tasks: tasksOf(level),
    })),
  }
}

export type ProjectSummary = ReturnType<typeof summarize>
export type LevelSummary = ProjectSummary['levels'][number]

export async function saveProject(project: Project, published: boolean, userId: string) {
  await query(
    `INSERT INTO journey_projects (id, track, title, position, published, definition, updated_by)
     VALUES ($1, $2, $3, COALESCE((SELECT position FROM journey_projects WHERE id = $1), $4), $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       track      = EXCLUDED.track,
       title      = EXCLUDED.title,
       published  = EXCLUDED.published,
       definition = EXCLUDED.definition,
       updated_by = EXCLUDED.updated_by,
       updated_at = now()`,
    [project.id, project.track, project.title, defaultPosition(project.id), published, JSON.stringify(project), userId],
  )
}

/** Bundled journeys keep their order; new ones go after them. */
function defaultPosition(id: string) {
  const bundled = bundledProjects.findIndex((project) => project.id === id)
  return bundled >= 0 ? bundled : bundledProjects.length + 100
}

export async function deleteProject(id: string) {
  const rows = await query('DELETE FROM journey_projects WHERE id = $1 RETURNING id', [id])
  return rows.length > 0
}
