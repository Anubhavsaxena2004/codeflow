import { validateProject } from '@/lib/journeys/validate'
import { jsonError, readBody, withAdmin } from '@/lib/server/api'
import { listCatalog, saveProject } from '@/lib/server/journeys'

/** Every journey, drafts included, with where it comes from. */
export async function GET() {
  return withAdmin(async () => {
    const entries = await listCatalog({ includeDrafts: true })
    return Response.json({
      projects: entries.map(({ project, published, source, updatedAt }) => ({
        id: project.id,
        track: project.track,
        title: project.title,
        summary: project.summary,
        worlds: project.worlds.length,
        levels: project.levels.length,
        published,
        source,
        updatedAt,
      })),
    })
  })
}

/** Creates a journey. Body: { definition, published? }. Fails if the id is taken; edit with PUT. */
export async function POST(request: Request) {
  return withAdmin(async (user) => {
    const body = await readBody(request)
    const result = validateProject(body?.definition)
    if (!result.ok) return Response.json({ error: 'The journey has problems.', errors: result.errors }, { status: 422 })

    const existing = await listCatalog({ includeDrafts: true })
    if (existing.some((entry) => entry.project.id === result.project.id)) return jsonError(409, `A journey with id "${result.project.id}" already exists.`)

    await saveProject(result.project, body?.published === true, user.id)
    return Response.json({ id: result.project.id }, { status: 201 })
  })
}
