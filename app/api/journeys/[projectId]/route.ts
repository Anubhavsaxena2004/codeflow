import { jsonError } from '@/lib/server/api'
import { getPublishedProject } from '@/lib/server/journeys'

/** One published journey with everything the workspace needs. */
export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const project = await getPublishedProject((await context.params).projectId)
  return project ? Response.json({ journey: project }) : jsonError(404, 'Unknown journey.')
}
