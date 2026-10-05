import { validateProject } from '@/lib/journeys/validate'
import { jsonError, readBody, withAdmin } from '@/lib/server/api'
import { deleteProject, getCatalogEntry, saveProject } from '@/lib/server/journeys'

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: Context) {
  return withAdmin(async () => {
    const entry = await getCatalogEntry((await context.params).id, { includeDrafts: true })
    return entry ? Response.json(entry) : jsonError(404, 'Unknown journey.')
  })
}

/**
 * Saves a journey: creates the row on first edit (a bundled journey becomes "edited"), then
 * updates it. Body: { definition, published }. Rejected with every problem listed if invalid.
 */
export async function PUT(request: Request, context: Context) {
  return withAdmin(async (user) => {
    const { id } = await context.params
    const body = await readBody(request)
    const result = validateProject(body?.definition)
    if (!result.ok) return Response.json({ error: 'The journey has problems.', errors: result.errors }, { status: 422 })
    if (result.project.id !== id) return jsonError(400, 'The id in the definition must match the URL. Create a new journey to change it.')
    if (typeof body?.published !== 'boolean') return jsonError(400, 'published must be true or false.')

    await saveProject(result.project, body.published, user.id)
    return Response.json(await getCatalogEntry(id, { includeDrafts: true }))
  })
}

/** Removes the stored row. For a bundled journey that means going back to the shipped version. */
export async function DELETE(_request: Request, context: Context) {
  return withAdmin(async () => {
    const { id } = await context.params
    if (!(await deleteProject(id))) return jsonError(404, 'Nothing stored for this journey.')
    return Response.json({ ok: true, entry: await getCatalogEntry(id, { includeDrafts: true }) })
  })
}
