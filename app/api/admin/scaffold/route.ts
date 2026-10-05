import { scaffoldProject } from '@/lib/journeys/scaffold'
import { isTrack } from '@/lib/journeys/types'
import { SLUG, validateProject } from '@/lib/journeys/validate'
import { jsonError, readBody, withAdmin } from '@/lib/server/api'

const text = (value: unknown, max: number) => (typeof value === 'string' && value.length <= max ? value : null)

/**
 * Drafts a journey from a topic, a folder tree and a request flow. Nothing is saved: the admin
 * reviews the draft, then creates it with POST /api/admin/projects.
 * Body: { id, track, title, summary?, projectName?, tree, flow? }
 */
export async function POST(request: Request) {
  return withAdmin(async () => {
    const body = await readBody(request)
    const id = text(body?.id, 63)
    const title = text(body?.title, 120)?.trim()
    const tree = text(body?.tree, 20_000)
    const flow = body?.flow === undefined ? '' : text(body.flow, 2_000)
    if (!id || !SLUG.test(id)) return jsonError(400, 'id must be lowercase letters, digits and dashes.')
    if (!isTrack(body?.track)) return jsonError(400, 'track must be mern, django or spring.')
    if (!title) return jsonError(400, 'Give the journey a title.')
    if (!tree?.trim()) return jsonError(400, 'Paste a folder tree (up to 20,000 characters).')
    if (flow === null) return jsonError(400, 'The flow is too long.')

    const { project, warnings } = scaffoldProject({
      id,
      track: body.track,
      title,
      tree,
      flow,
      summary: text(body?.summary, 300) ?? undefined,
      projectName: text(body?.projectName, 80) ?? undefined,
    })
    const result = validateProject(project)
    return Response.json({ project, warnings, errors: result.ok ? [] : result.errors })
  })
}
