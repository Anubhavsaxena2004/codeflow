import { isTrack } from '@/lib/journeys/types'
import { jsonError } from '@/lib/server/api'
import { listCatalog, summarize } from '@/lib/server/journeys'

/** Published journeys for the map, without file contents. `?track=mern` narrows to one stack. */
export async function GET(request: Request) {
  const track = new URL(request.url).searchParams.get('track')
  if (track !== null && !isTrack(track)) return jsonError(400, 'track must be mern, django or spring.')
  const entries = await listCatalog()
  return Response.json({ journeys: entries.filter((entry) => !track || entry.project.track === track).map((entry) => summarize(entry.project)) })
}
