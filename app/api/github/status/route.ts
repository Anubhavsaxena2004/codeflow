import { withUser } from '@/lib/server/api'
import { getConnection, getLinkedRepo, listLinkedRepos } from '@/lib/github/store'

/** Connected? repo linked? last push info — everything the UI needs for the GitHub panel. */
export async function GET(request: Request) {
  return withUser(async (user) => {
    const journeyId = new URL(request.url).searchParams.get('journeyId')
    const connection = await getConnection(user.id)

    return Response.json({
      connected: connection !== null,
      login: connection?.githubLogin ?? null,
      repo: journeyId ? await getLinkedRepo(user.id, journeyId) : null,
      repos: await listLinkedRepos(user.id),
    })
  })
}
